# Kong Gateway + Zitadel SSO E2E Tests

End-to-end test suite for testing the Kong Gateway and Zitadel SSO integration for the kombify platform.

## Overview

This test suite validates the complete authentication flow:

```
User → Kong Gateway → Zitadel → Kong Gateway → KombiSphere-Cloud → Dashboard
```

## Test Coverage

### 1. Kong Gateway Health & Configuration
- ✅ Health endpoint availability
- ✅ Services configuration
- ✅ Routes configuration
- ✅ Zitadel JWKS endpoint accessibility

### 2. Zitadel Authentication Flows
- ✅ User registration flow
- ✅ User login flow
- ✅ JWT token extraction and validation
- ✅ Session management

### 3. Kong JWT Validation
- ✅ Unauthenticated requests return 401
- ✅ Invalid JWT returns 401
- ✅ Valid JWT allows access
- ✅ Public endpoints work without auth

### 4. Dashboard Access Control
- ✅ Unauthenticated users redirected to login
- ✅ Authenticated users see dashboard
- ✅ Role-based access control

### 5. Performance Metrics
- ✅ Response time measurements
- ✅ Authentication flow timing
- ✅ API endpoint performance

## Getting Started

### Prerequisites

- Node.js 18+
- Playwright browsers installed
- Access to test environment

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Create environment file
cp .env.example .env
# Edit .env with your values
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `KONG_URL` | Kong Gateway URL | ✅ |
| `ZITADEL_ISSUER` | Zit OIDC issuer URL | ✅ |
| `ZITADEL_CLIENT_ID` | Zitadel client ID | ✅ |
| `KOMBISPHERE_URL` | KombiSphere app URL | ✅ |
| `REDIS_HOST` | Redis host | ❌ |
| `REDIS_PASSWORD` | Redis password | ❌ |
| `TESTMAIL_NAMESPACE` | testmail.app namespace | ❌ |
| `TESTMAIL_API_KEY` | testmail.app API key | ❌ |

## Running Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Run specific browser
npm run test:chromium
npm run test:firefox
npm run test:webkit

# Run specific test file
npx playwright test tests/e2e/kong-zitadel-flow.spec.ts

# Debug mode
npx playwright test --debug
```

## Test Structure

```
tests/e2e/
├── kong-zitadel-flow.spec.ts    # Main test suite
├── helpers/
│   └── auth.ts                  # Authentication utilities
└── README.md                    # This file
```

## Helper Functions

### Authentication Helpers (`helpers/auth.ts`)

```typescript
// Generate test user
const user = generateTestUser();

// Login with Zitadel
await loginWithZitadel(page, email, password);

// Extract JWT token
const token = await extractJWT(page);

// Make authenticated API request
const result = await kongApiRequest(request, '/v1/admin/health', {
  token: accessToken
});

// Check if authenticated
const isAuth = await isAuthenticated(page);
```

## CI/CD Integration

Tests run automatically on:
- Pull requests affecting test files
- Daily schedule (6 AM UTC)
- Manual trigger via GitHub Actions

### GitHub Actions Workflow

See `.github/workflows/kong-zitadel-e2e.yml`

## Troubleshooting

### Common Issues

**1. Tests timeout on Kong requests**
- Check if Kong Container App is running
- Verify Kong health endpoint: `curl $KONG_URL/health`
- Check Kong logs in Azure Container Apps

**2. Zitadel login fails**
- Verify Zitadel issuer URL is correct
- Check if test user credentials are valid
- Ensure Zitadel instance is accessible

**3. DNS resolution errors**
- Verify application URLs are correct
- Check if domains are configured in DNS
- For local testing, update hosts file

### Debug Mode

```bash
# Run with debug output
DEBUG=pw:api npx playwright test

# Run with browser visible
npx playwright test --headed

# Run specific test with UI
npx playwright test --ui
```

## Test Reports

After running tests, reports are generated in:

- `playwright-report/` - HTML report
- `test-results/results.json` - JSON results
- `test-results/` - Screenshots and videos (on failure)

View HTML report:
```bash
npx playwright show-report
```

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use helper functions for common operations
3. Add proper error handling
4. Update this README
5. Test locally before pushing

## Security Notes

- Never commit `.env` file with real credentials
- Use testmail.app for disposable email testing
- Rotate test credentials regularly
- Use Azure Key Vault for CI/CD secrets

## Support

For issues or questions:
- Platform Team: platform@kombify.io
- Create issue in GitHub
- Check internal documentation
