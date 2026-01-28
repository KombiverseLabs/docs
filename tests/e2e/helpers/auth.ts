/**
 * Authentication Helpers for Kong-Zitadel E2E Tests
 * 
 * Provides utilities for:
 * - Test email generation (using testmail.app)
 * - JWT token handling
 * - Zitadel authentication flows
 * - Kong API authentication
 */

import { Page, APIRequestContext } from '@playwright/test';

// =============================================================================
// TYPES
// =============================================================================

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
}

export interface ZitadelUser {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const ZITADEL_ISSUER = process.env.ZITADEL_ISSUER || 'https://auth.kombisphere.io';
export const ZITADEL_CLIENT_ID = process.env.ZITADEL_CLIENT_ID || '';
export const KONG_URL = process.env.KONG_URL || 'https://ca-kong-kombify-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io';
export const KOMBISPHERE_URL = process.env.KOMBISPHERE_URL || 'https://app.kombify.io';

// TestMail.app configuration for disposable email testing
const TESTMAIL_NAMESPACE = process.env.TESTMAIL_NAMESPACE || 'kombify';

// =============================================================================
// TEST EMAIL GENERATION
// =============================================================================

/**
 * Generate a unique test email using testmail.app
 * Format: test-{timestamp}-{random}@testmail.app
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${timestamp}-${random}@testmail.app`;
}

/**
 * Generate a test email with a specific tag for organization
 */
export function generateTestEmailWithTag(tag: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `test-${tag}-${timestamp}-${random}@testmail.app`;
}

/**
 * Generate test user data with secure random password
 */
export function generateTestUser(firstName?: string, lastName?: string): TestUser {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return {
    email: `test-${timestamp}-${random}@testmail.app`,
    password: `TestPass_${random}_${timestamp}!`,
    firstName: firstName || `Test${random.substring(0, 4)}`,
    lastName: lastName || `User${random.substring(0, 4)}`,
  };
}

// =============================================================================
// ZITADEL AUTHENTICATION
// =============================================================================

/**
 * Navigate to Zitadel login page and perform login
 */
export async function loginWithZitadel(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  // Wait for Zitadel login form
  await page.waitForSelector('input[name="loginName"], input[type="email"]', { timeout: 10000 });
  
  // Fill email/username
  const emailInput = await page.locator('input[name="loginName"], input[type="email"]').first();
  await emailInput.fill(email);
  
  // Click next/submit
  await page.click('button[type="submit"], button:has-text("Next"), button:has-text("Continue")');
  
  // Wait for password field
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  
  // Fill password
  await page.fill('input[type="password"]', password);
  
  // Submit login
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
  
  // Wait for redirect back to app
  await page.waitForLoadState('networkidle');
}

/**
 * Perform Zitadel registration flow
 */
export async function registerWithZitadel(
  page: Page,
  user: TestUser
): Promise<void> {
  // Navigate to registration page
  await page.goto(`${ZITADEL_ISSUER}/ui/login/register`);
  
  // Wait for registration form
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
  
  // Fill registration form
  await page.fill('input[type="email"], input[name="email"]', user.email);
  await page.fill('input[type="password"], input[name="password"]', user.password);
  await page.fill('input[name="firstName"], input[placeholder*="First"]', user.firstName);
  await page.fill('input[name="lastName"], input[placeholder*="Last"]', user.lastName);
  
  // Submit registration
  await page.click('button[type="submit"], button:has-text("Register"), button:has-text("Sign up")');
  
  // Wait for email verification or redirect
  await page.waitForTimeout(3000);
}

/**
 * Complete email verification (if required)
 */
export async function verifyEmail(page: Page, verificationCode?: string): Promise<void> {
  if (verificationCode) {
    await page.fill('input[name="code"], input[placeholder*="code"]', verificationCode);
    await page.click('button[type="submit"], button:has-text("Verify")');
    await page.waitForTimeout(2000);
  }
}

/**
 * Check if user is authenticated by looking for auth indicators
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Check for common authenticated indicators
    const authIndicators = [
      '[data-testid="user-menu"]',
      '.user-avatar',
      'button:has-text("Logout")',
      'a:has-text("Logout")',
      '[data-testid="dashboard"]',
    ];
    
    for (const indicator of authIndicators) {
      const element = page.locator(indicator).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Logout from the application
 */
export async function logout(page: Page): Promise<void> {
  // Try different logout patterns
  const logoutSelectors = [
    'button:has-text("Logout")',
    'a:has-text("Logout")',
    '[data-testid="logout-button"]',
    'button:has-text("Sign out")',
    'a:has-text("Sign out")',
  ];
  
  for (const selector of logoutSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        await element.click();
        await page.waitForTimeout(2000);
        return;
      }
    } catch {
      continue;
    }
  }
  
  // Fallback: navigate to logout URL
  await page.goto(`${KOMBISPHERE_URL}/api/auth/signout`);
  await page.waitForTimeout(2000);
}

// =============================================================================
// JWT TOKEN HANDLING
// =============================================================================

/**
 * Extract JWT from localStorage/sessionStorage or cookies
 */
export async function extractJWT(page: Page): Promise<string | null> {
  // Try localStorage first
  const localStorageToken = await page.evaluate(() => {
    const keys = ['access_token', 'token', 'jwt', 'auth_token'];
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value) return value;
    }
    return null;
  });
  
  if (localStorageToken) return localStorageToken;
  
  // Try sessionStorage
  const sessionStorageToken = await page.evaluate(() => {
    const keys = ['access_token', 'token', 'jwt', 'auth_token'];
    for (const key of keys) {
      const value = sessionStorage.getItem(key);
      if (value) return value;
    }
    return null;
  });
  
  if (sessionStorageToken) return sessionStorageToken;
  
  // Try cookies
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(c => 
    ['access_token', 'token', 'jwt', 'auth_token', 'next-auth.session-token'].includes(c.name)
  );
  
  return authCookie?.value || null;
}

/**
 * Decode JWT payload without verification
 */
export function decodeJWT(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  const payload = decodeJWT(token);
  if (!payload?.exp) return null;
  
  return new Date(payload.exp * 1000);
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  
  return new Date() > expiration;
}

// =============================================================================
// KONG API AUTHENTICATION
// =============================================================================

/**
 * Make authenticated API request to Kong
 */
export async function kongApiRequest(
  request: APIRequestContext,
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    token?: string;
    data?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<{ status: number; data: any; headers: Record<string, string> }> {
  const { method = 'GET', token, data, headers = {} } = options;
  
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };
  
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const url = endpoint.startsWith('http') ? endpoint : `${KONG_URL}${endpoint}`;
  
  const response = await request.fetch(url, {
    method,
    headers: requestHeaders,
    data: data ? JSON.stringify(data) : undefined,
  });
  
  const responseHeaders: Record<string, string> = {};
  response.headers().forEach((value, key) => {
    responseHeaders[key] = value;
  });
  
  let responseData: any = null;
  try {
    responseData = await response.json();
  } catch {
    responseData = await response.text();
  }
  
  return {
    status: response.status(),
    data: responseData,
    headers: responseHeaders,
  };
}

/**
 * Test Kong health endpoint
 */
export async function checkKongHealth(
  request: APIRequestContext
): Promise<{ healthy: boolean; status: number; data?: any }> {
  try {
    const result = await kongApiRequest(request, '/health', { method: 'GET' });
    return {
      healthy: result.status === 200,
      status: result.status,
      data: result.data,
    };
  } catch (error) {
    return {
      healthy: false,
      status: 0,
      data: { error: String(error) },
    };
  }
}

/**
 * Test Kong JWT validation
 */
export async function testKongJWTValidation(
  request: APIRequestContext,
  token: string,
  endpoint: string = '/v1/admin/health'
): Promise<{ valid: boolean; status: number; headers: Record<string, string> }> {
  const result = await kongApiRequest(request, endpoint, { token });
  
  return {
    valid: result.status !== 401 && result.status !== 403,
    status: result.status,
    headers: result.headers,
  };
}

// =============================================================================
// ZITADEL API HELPERS
// =============================================================================

/**
 * Get Zitadel user info using introspection endpoint
 */
export async function getZitadelUserInfo(
  request: APIRequestContext,
  accessToken: string
): Promise<ZitadelUser | null> {
  try {
    const response = await request.post(`${ZITADEL_ISSUER}/oauth/v2/introspect`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      form: {
        token: accessToken,
        client_id: ZITADEL_CLIENT_ID,
      },
    });
    
    if (response.status() !== 200) {
      return null;
    }
    
    const data = await response.json();
    
    if (!data.active) {
      return null;
    }
    
    return {
      id: data.sub,
      email: data.email || data.preferred_username,
      displayName: data.name || data.preferred_username,
      firstName: data.given_name || '',
      lastName: data.family_name || '',
    };
  } catch {
    return null;
  }
}

/**
 * Fetch Zitadel JWKS for JWT verification
 */
export async function fetchZitadelJWKS(
  request: APIRequestContext
): Promise<any | null> {
  try {
    const response = await request.get(`${ZITADEL_ISSUER}/oauth/v2/keys`);
    
    if (response.status() !== 200) {
      return null;
    }
    
    return await response.json();
  } catch {
    return null;
  }
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Clear all authentication state
 */
export async function clearAuthState(page: Page): Promise<void> {
  // Clear localStorage
  await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('token') || key.includes('auth') || key.includes('session')) {
        localStorage.removeItem(key);
      }
    });
  });
  
  // Clear sessionStorage
  await page.evaluate(() => {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.includes('token') || key.includes('auth') || key.includes('session')) {
        sessionStorage.removeItem(key);
      }
    });
  });
  
  // Clear cookies
  const cookies = await page.context().cookies();
  for (const cookie of cookies) {
    if (cookie.name.includes('token') || cookie.name.includes('auth') || cookie.name.includes('session')) {
      await page.context().clearCookies({ name: cookie.name });
    }
  }
}

/**
 * Setup fresh browser context for isolated tests
 */
export async function createIsolatedContext(browser: any) {
  const context = await browser.newContext({
    clearCookies: true,
    storageState: undefined,
  });
  
  return context;
}

// =============================================================================
// PERFORMANCE METRICS
// =============================================================================

/**
 * Measure authentication flow performance
 */
export async function measureAuthFlow(
  page: Page,
  flow: () => Promise<void>
): Promise<{ duration: number; success: boolean }> {
  const startTime = Date.now();
  
  try {
    await flow();
    const duration = Date.now() - startTime;
    
    return {
      duration,
      success: true,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      duration,
      success: false,
    };
  }
}

/**
 * Measure API response time through Kong
 */
export async function measureKongResponseTime(
  request: APIRequestContext,
  endpoint: string,
  token?: string
): Promise<{ duration: number; status: number }> {
  const startTime = Date.now();
  
  const result = await kongApiRequest(request, endpoint, { token });
  const duration = Date.now() - startTime;
  
  return {
    duration,
    status: result.status,
  };
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Validate JWT token structure
 */
export function validateJWTStructure(token: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check basic format
  const parts = token.split('.');
  if (parts.length !== 3) {
    errors.push('Token must have 3 parts (header.payload.signature)');
    return { valid: false, errors };
  }
  
  // Try to decode header
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf-8'));
    if (!header.alg) {
      errors.push('Header missing "alg" claim');
    }
    if (!header.typ) {
      errors.push('Header missing "typ" claim');
    }
  } catch {
    errors.push('Invalid header encoding');
  }
  
  // Try to decode payload
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    if (!payload.sub) {
      errors.push('Payload missing "sub" (subject) claim');
    }
    if (!payload.iss) {
      errors.push('Payload missing "iss" (issuer) claim');
    }
    if (!payload.exp) {
      errors.push('Payload missing "exp" (expiration) claim');
    }
    if (!payload.iat) {
      errors.push('Payload missing "iat" (issued at) claim');
    }
  } catch {
    errors.push('Invalid payload encoding');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Zitadel token claims
 */
export function validateZitadelClaims(payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required claims for Zitadel
  const requiredClaims = ['sub', 'iss', 'aud', 'exp', 'iat'];
  for (const claim of requiredClaims) {
    if (!payload[claim]) {
      errors.push(`Missing required claim: ${claim}`);
    }
  }
  
  // Validate issuer
  if (payload.iss && !payload.iss.includes('zitadel')) {
    errors.push('Issuer does not appear to be Zitadel');
  }
  
  // Check for user info claims
  if (!payload.email && !payload.preferred_username) {
    errors.push('Missing user identifier (email or preferred_username)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  generateTestEmail,
  generateTestUser,
  loginWithZitadel,
  registerWithZitadel,
  verifyEmail,
  isAuthenticated,
  logout,
  extractJWT,
  decodeJWT,
  getTokenExpiration,
  isTokenExpired,
  kongApiRequest,
  checkKongHealth,
  testKongJWTValidation,
  getZitadelUserInfo,
  fetchZitadelJWKS,
  clearAuthState,
  createIsolatedContext,
  measureAuthFlow,
  measureKongResponseTime,
  validateJWTStructure,
  validateZitadelClaims,
};
