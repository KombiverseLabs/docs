import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for automated documentation screenshots
 * 
 * This captures UI screenshots from kombify products for use in documentation.
 * Screenshots are saved to /images/screenshots/ and can be referenced in MDX files.
 * 
 * Usage:
 *   npm run screenshots           # Run all screenshot captures
 *   npm run screenshots:update    # Update existing screenshots
 *   npm run screenshots:compare   # Compare with baseline
 */
export default defineConfig({
  testDir: './tests',
  outputDir: '../../images/screenshots',
  
  // Fail fast in CI, but allow retries locally
  retries: process.env.CI ? 0 : 2,
  
  // Run tests in parallel for speed
  workers: process.env.CI ? 1 : undefined,
  
  // Screenshot settings
  use: {
    // Consistent viewport for all screenshots
    viewport: { width: 1280, height: 720 },
    
    // Ignore HTTPS errors for local dev servers
    ignoreHTTPSErrors: true,
    
    // Wait for network to be idle before taking screenshots
    actionTimeout: 30000,
    
    // Dark mode by default (matches docs theme)
    colorScheme: 'dark',
  },

  // Project configurations for different screen sizes
  projects: [
    {
      name: 'desktop-dark',
      use: { 
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
      },
    },
    {
      name: 'desktop-light',
      use: { 
        ...devices['Desktop Chrome'],
        colorScheme: 'light',
      },
    },
    {
      name: 'mobile',
      use: { 
        ...devices['iPhone 13'],
        colorScheme: 'dark',
      },
    },
  ],

  // Web server configuration - start apps if not running
  webServer: [
    {
      // kombify Sphere (SvelteKit)
      command: 'echo "Using external server"',
      url: process.env.SPHERE_URL || 'https://app.kombisphere.io',
      reuseExistingServer: true,
      ignoreHTTPSErrors: true,
    },
  ],
});
