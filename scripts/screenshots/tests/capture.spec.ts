import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Screenshot test suite for kombify Sphere documentation
 * 
 * These tests capture UI screenshots for use in documentation.
 * Each screenshot is saved with a descriptive name and can be used in MDX files:
 * 
 *   <Frame>
 *     <img src="/images/screenshots/sphere-dashboard.png" alt="Sphere Dashboard" />
 *   </Frame>
 */

const SCREENSHOT_DIR = path.join(__dirname, '../../images/screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Helper to take consistent screenshots
async function captureScreenshot(page: Page, name: string, options: {
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  waitFor?: string;
  hideSelectors?: string[];
} = {}) {
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Optional: wait for specific element
  if (options.waitFor) {
    await page.waitForSelector(options.waitFor, { state: 'visible' });
  }
  
  // Optional: hide elements (e.g., dynamic content, timestamps)
  if (options.hideSelectors) {
    for (const selector of options.hideSelectors) {
      await page.evaluate((sel) => {
        document.querySelectorAll(sel).forEach(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      }, selector);
    }
  }
  
  // Capture screenshot
  const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({
    path: screenshotPath,
    fullPage: options.fullPage ?? false,
    clip: options.clip,
  });
  
  console.log(`✓ Captured: ${name}.png`);
  return screenshotPath;
}

// ============================================================================
// KOMBIFY SPHERE SCREENSHOTS
// ============================================================================

test.describe('Sphere Dashboard', () => {
  const SPHERE_URL = process.env.SPHERE_URL || 'https://app.kombisphere.io';
  
  test.beforeEach(async ({ page }) => {
    // Skip if not authenticated - these require login
    test.skip(!process.env.SPHERE_AUTH_TOKEN, 'Requires SPHERE_AUTH_TOKEN');
    
    // Set auth cookie/token if available
    if (process.env.SPHERE_AUTH_TOKEN) {
      await page.context().addCookies([{
        name: 'auth_token',
        value: process.env.SPHERE_AUTH_TOKEN,
        domain: new URL(SPHERE_URL).hostname,
        path: '/',
      }]);
    }
  });

  test('capture dashboard overview', async ({ page }) => {
    await page.goto(`${SPHERE_URL}/dashboard`);
    await captureScreenshot(page, 'sphere-dashboard', {
      waitFor: '[data-testid="dashboard-content"]',
      hideSelectors: ['[data-testid="user-avatar"]', '[data-testid="timestamp"]'],
    });
  });

  test('capture tool launcher', async ({ page }) => {
    await page.goto(`${SPHERE_URL}/tools`);
    await captureScreenshot(page, 'sphere-tool-launcher', {
      waitFor: '[data-testid="tools-grid"]',
    });
  });

  test('capture subscription page', async ({ page }) => {
    await page.goto(`${SPHERE_URL}/subscription`);
    await captureScreenshot(page, 'sphere-subscription', {
      waitFor: '[data-testid="subscription-plans"]',
    });
  });
});

// ============================================================================
// KOMBIFY STACK SCREENSHOTS
// ============================================================================

test.describe('Stack UI', () => {
  const STACK_URL = process.env.STACK_URL || 'http://localhost:5260';
  
  test.skip(!process.env.STACK_URL, 'Requires STACK_URL environment variable');

  test('capture stack dashboard', async ({ page }) => {
    await page.goto(`${STACK_URL}/`);
    await captureScreenshot(page, 'stack-dashboard', {
      waitFor: 'main',
    });
  });

  test('capture nodes view', async ({ page }) => {
    await page.goto(`${STACK_URL}/nodes`);
    await captureScreenshot(page, 'stack-nodes', {
      waitFor: '[data-testid="nodes-list"]',
    });
  });

  test('capture job history', async ({ page }) => {
    await page.goto(`${STACK_URL}/jobs`);
    await captureScreenshot(page, 'stack-jobs', {
      waitFor: '[data-testid="jobs-list"]',
    });
  });
});

// ============================================================================
// KOMBIFY SIM SCREENSHOTS
// ============================================================================

test.describe('Sim UI', () => {
  const SIM_URL = process.env.SIM_URL || 'http://localhost:5271';
  
  test.skip(!process.env.SIM_URL, 'Requires SIM_URL environment variable');

  test('capture sim dashboard', async ({ page }) => {
    await page.goto(`${SIM_URL}/`);
    await captureScreenshot(page, 'sim-dashboard', {
      waitFor: 'main',
    });
  });

  test('capture nodes management', async ({ page }) => {
    await page.goto(`${SIM_URL}/nodes`);
    await captureScreenshot(page, 'sim-nodes', {
      waitFor: '[data-testid="nodes-grid"]',
    });
  });

  test('capture templates page', async ({ page }) => {
    await page.goto(`${SIM_URL}/templates`);
    await captureScreenshot(page, 'sim-templates', {
      waitFor: '[data-testid="templates-list"]',
    });
  });
});

// ============================================================================
// PUBLIC PAGES (NO AUTH REQUIRED)
// ============================================================================

test.describe('Public Pages', () => {
  test('capture marketing hero', async ({ page }) => {
    await page.goto('https://kombify.dev');
    await captureScreenshot(page, 'marketing-hero', {
      waitFor: 'main',
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });
  });

  test('capture docs homepage', async ({ page }) => {
    await page.goto('https://docs.kombify.dev');
    await captureScreenshot(page, 'docs-homepage', {
      waitFor: 'main',
    });
  });
});
