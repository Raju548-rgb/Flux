FROM node:20-slim

WORKDIR /app

# Install OpenSSL (Required by Prisma on Debian-slim)
RUN apt-get update && apt-get install -y openssl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client while still root
RUN npx prisma generate

# Build the backend
RUN npm run build

# Create and use non-root user for security
RUN addgroup --system app && adduser --system --ingroup app app
RUN mkdir logs && chown app:app logs
USER app

# Set to production mode
ENV NODE_ENV=production

EXPOSE 5000

# Start server in production mode
CMD ["npm", "start"]
