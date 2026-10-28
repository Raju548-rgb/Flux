import express, { Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { z } from 'zod';
import redis from '../redis.js';
import logger from '../utils/logger.js';

dotenv.config();

const prisma = new PrismaClient();
const router = express.Router();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  logger.error("FATAL ERROR: JWT_SECRET or JWT_REFRESH_SECRET is not defined in the environment.");
  process.exit(1);
}

if (!CLIENT_ID || !CLIENT_SECRET) {
  logger.error("FATAL ERROR: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not defined.");
  process.exit(1);
}

interface JwtPayload {
  id: number;
}

// Helper to set HttpOnly cookies
const setTokensAsCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const isProd = process.env.NODE_ENV === 'production';
  
  res.cookie('flux_access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000 // 15 mins
  });

  res.cookie('flux_refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

// 1. Redirect user to GitHub OAuth login
router.get('/github', async (req: Request, res: Response) => {
  // PKCE Generation & CSRF Protection
  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  
  // Store code_verifier in Redis using state as key (10 mins TTL) to validate it later
  await redis.set(`oauth_state:${state}`, codeVerifier, 'EX', 10 * 60);

  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=user:email&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`; 

  res.redirect(redirectUri);
});

// Zod schema for GitHub callback query validation
const githubCallbackSchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
  state: z.string().min(1, "State is required")
});

// 2. Handle GitHub callback
router.get('/github/callback', async (req: Request, res: Response) => {
  const validationResult = githubCallbackSchema.safeParse(req.query);

  if (!validationResult.success) {
    logger.error(`Validation Error: ${JSON.stringify(validationResult.error.issues)}`);
    return res.redirect(`${FRONTEND_URL}/?error=InvalidRequest`);
  }

  const { code, state } = validationResult.data;

  try {
    // A. Validate state against Redis (CSRF Protection)
    const storedVerifier = await redis.get(`oauth_state:${state}`);
    if (!storedVerifier) {
      logger.warn(`State validation failed or expired for state: ${state}`);
      return res.redirect(`${FRONTEND_URL}/?error=InvalidState`);
    }
    await redis.del(`oauth_state:${state}`); // One-time use

    // B. Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        code_verifier: storedVerifier
      },
      {
        headers: { Accept: 'application/json' },
      }
    );

    const githubAccessToken = tokenResponse.data.access_token;
    if (!githubAccessToken) {
      logger.error(`Failed to get access token from GitHub: ${JSON.stringify(tokenResponse.data)}`);
      return res.redirect(`${FRONTEND_URL}/?error=GitHubTokenFailed`);
    }

    // C. Fetch user data from GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${githubAccessToken}` },
    });

    const githubUser = userResponse.data;

    let email = githubUser.email;
    if (!email) {
      const emailResponse = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      });
      const primaryEmail = emailResponse.data.find((e: any) => e.primary);
      if (primaryEmail) {
        email = primaryEmail.email;
      }
    }

    const githubId = String(githubUser.id);
    const username = githubUser.login;
    const avatarUrl = githubUser.avatar_url;

    // D. Save or update user
    const user = await prisma.user.upsert({
      where: { githubId: String(githubId) },
      update: { username, email, avatarUrl },
      create: { githubId: String(githubId), username, email, avatarUrl },
    });

    // E. Generate Access and Refresh Tokens
    const payload = { id: user.id };
    
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    
    await redis.set(`refresh_token:${refreshToken}`, String(user.id), 'EX', 7 * 24 * 60 * 60);

    // F. Set Cookies and Redirect straight to Dashboard
    setTokensAsCookies(res, accessToken, refreshToken);
    res.redirect(`${FRONTEND_URL}/dashboard`);

  } catch (error: any) {
    logger.error(`OAuth Error: ${JSON.stringify(error?.response?.data || error.message)}`);
    res.redirect(`${FRONTEND_URL}/?error=AuthenticationFailed`);
  }
});

// 3. Get current user profile
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.cookies.flux_access_token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token revoked. Please login again.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, githubId: true, username: true, email: true, avatarUrl: true, createdAt: true }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// 4. Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies.flux_refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token is required' });
  }

  try {
    const userIdStr = await redis.get(`refresh_token:${refreshToken}`);
    if (!userIdStr) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if the current access token is blacklisted
    const accessToken = req.cookies.flux_access_token;
    if (accessToken) {
      const isBlacklisted = await redis.get(`blacklist:${accessToken}`);
      if (isBlacklisted) {
        return res.status(401).json({ error: 'Session revoked' });
      }
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const payload = { id: user.id };
    
    const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    await redis.del(`refresh_token:${refreshToken}`);
    await redis.set(`refresh_token:${newRefreshToken}`, String(user.id), 'EX', 7 * 24 * 60 * 60);

    setTokensAsCookies(res, newAccessToken, newRefreshToken);
    res.json({ message: 'Tokens refreshed' });
  } catch (err) {
    return res.status(401).json({ error: 'Expired or invalid refresh token' });
  }
});

// 5. Logout
router.post('/logout', async (req: Request, res: Response) => {
  const accessToken = req.cookies.flux_access_token;
  const refreshToken = req.cookies.flux_refresh_token;

  if (refreshToken) {
    await redis.del(`refresh_token:${refreshToken}`);
  }

  if (accessToken) {
    const decoded = jwt.decode(accessToken) as JwtPayload;
    let ttl = 15 * 60; // 15m
    if (decoded && (decoded as any).exp) {
      const now = Math.floor(Date.now() / 1000);
      ttl = Math.max(0, (decoded as any).exp - now);
    }
    if (ttl > 0) {
      await redis.set(`blacklist:${accessToken}`, 'true', 'EX', ttl);
    }
  }

  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/'
  };

  res.clearCookie('flux_access_token', cookieOptions);
  res.clearCookie('flux_refresh_token', cookieOptions);
  res.json({ message: 'Logged out successfully' });
});

export default router;
