import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Landing from './Landing';

describe('Landing Page', () => {
  it('renders the landing page content correctly', () => {
    render(
      <BrowserRouter>
        <Landing />
      </BrowserRouter>
    );

    // Check for the main heading
    expect(
      screen.getByText(/Code together, build faster\./i)
    ).toBeInTheDocument();

    // Check for the Github login buttons (there should be two: one in nav, one in hero)
    const loginButtons = screen.getAllByText(
      /Login with GitHub|git commit -m "with love"/i
    );
    expect(loginButtons.length).toBeGreaterThan(0);

    // Check for logo text
    expect(screen.getByText('FLUX')).toBeInTheDocument();
  });
});
