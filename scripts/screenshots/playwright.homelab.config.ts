import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for homelab terminal screenshots
 * No webserver required - generates HTML content directly
 */
export default defineConfig({
  testDir: './tests',
  outputDir: '../../images',
  
  retries: 0,
  workers: 1,
  
  use: {
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    actionTimeout: 30000,
    colorScheme: 'dark',
  },

  projects: [
    {
      name: 'desktop-dark',
      use: { 
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
      },
    },
  ],

  // No webserver needed - we generate HTML content directly
});
