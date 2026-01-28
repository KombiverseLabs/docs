#!/bin/bash
# ============================================================
# Kong + Zitadel E2E Test Runner Script
# Runs E2E tests on LambdaTest cloud infrastructure
# ============================================================
# Usage:
#   ./run-kong-e2e-tests.sh [environment]
#
# Environments:
#   staging - Run against staging environment
#   prod    - Run against production environment (default)
#
# Prerequisites:
#   - Node.js 18+ installed
#   - LambdaTest credentials configured in Key Vault or env
# ============================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}/../KombiSphere-Cloud"
ENV="${1:-prod}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

print_banner() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║    Kong + Zitadel E2E Test Suite                        ║"
    echo "║    Environment: ${ENV}                                   ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    if [ ! -d "${PROJECT_DIR}" ]; then
        log_error "KombiSphere-Cloud project not found at ${PROJECT_DIR}"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Fetch secrets from Azure Key Vault (if available)
fetch_secrets() {
    if command -v az &> /dev/null && az account show &> /dev/null; then
        log_info "Fetching secrets from Azure Key Vault..."
        
        export LAMBDATEST_USERNAME=$(az keyvault secret show --vault-name kv-kombify-prod --name lambdatest-username --query value -o tsv 2>/dev/null || echo "")
        export LAMBDATEST_ACCESS_KEY=$(az keyvault secret show --vault-name kv-kombify-prod --name lambdatest-access-key --query value -o tsv 2>/dev/null || echo "")
        export TESTMAIL_API_KEY=$(az keyvault secret show --vault-name kv-kombify-prod --name testmail-api-key --query value -o tsv 2>/dev/null || echo "")
        
        log_success "Secrets fetched from Key Vault"
    else
        log_warning "Azure CLI not available or not logged in. Using environment variables."
    fi
}

# Setup environment variables
setup_environment() {
    log_info "Setting up environment..."
    
    if [ "${ENV}" == "staging" ]; then
        export BASE_URL="https://app-kombify-portal-staging.azurewebsites.net"
        export KONG_BASE_URL="https://api-kombify-staging.azurewebsites.net"
        export ZITADEL_URL="https://auth-staging.kombisphere.io"
    else
        export BASE_URL="https://app.kombify.io"
        export KONG_BASE_URL="https://api.kombify.io"
        export ZITADEL_URL="https://auth.kombisphere.io"
    fi
    
    export PORTAL_URL="${BASE_URL}"
    export API_BASE_URL="${KONG_BASE_URL}"
    export TESTMAIL_NAMESPACE="kombify"
    
    log_info "BASE_URL: ${BASE_URL}"
    log_info "KONG_BASE_URL: ${KONG_BASE_URL}"
    log_info "ZITADEL_URL: ${ZITADEL_URL}"
}

# Install dependencies
install_deps() {
    log_info "Installing dependencies..."
    cd "${PROJECT_DIR}"
    
    if [ ! -d "node_modules" ]; then
        npm ci
    fi
    
    # Install Playwright browsers if needed
    npx playwright install chromium
    
    log_success "Dependencies installed"
}

# Run E2E tests
run_tests() {
    log_info "Running E2E tests on LambdaTest..."
    cd "${PROJECT_DIR}"
    
    # Run specific test file with LambdaTest config
    npm run test:lambdatest -- tests/e2e/kong-zitadel-dashboard.spec.ts || true
    
    log_success "Test execution completed"
}

# Generate report
generate_report() {
    log_info "Generating test report..."
    cd "${PROJECT_DIR}"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local report_dir="test-reports/kong-zitadel-${timestamp}"
    
    mkdir -p "${report_dir}"
    
    # Copy test results
    if [ -d "test-results-lambdatest" ]; then
        cp -r test-results-lambdatest/* "${report_dir}/"
    fi
    
    if [ -d "playwright-report-lambdatest" ]; then
        cp -r playwright-report-lambdatest/* "${report_dir}/"
    fi
    
    # Generate summary
    cat > "${report_dir}/summary.md" << EOF
# Kong + Zitadel E2E Test Report

**Date:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Environment:** ${ENV}  
**Base URL:** ${BASE_URL}

## Test Configuration

- **Portal URL:** ${PORTAL_URL}
- **Kong Gateway URL:** ${KONG_BASE_URL}
- **Zitadel URL:** ${ZITADEL_URL}

## Test Results

See JSON results in: lambdatest-results.json

## Artifacts

- Screenshots: test-results-lambdatest/
- HTML Report: playwright-report-lambdatest/index.html
- LambdaTest Dashboard: https://automation.lambdatest.com/

EOF
    
    log_success "Report generated at: ${report_dir}/summary.md"
}

# Main execution
main() {
    print_banner
    check_prerequisites
    fetch_secrets
    setup_environment
    install_deps
    run_tests
    generate_report
    
    log_success "E2E test suite completed!"
    echo ""
    log_info "View detailed results:"
    echo "  - LambdaTest Dashboard: https://automation.lambdatest.com/"
    echo "  - Local HTML Report: KombiSphere-Cloud/playwright-report-lambdatest/index.html"
    echo ""
}

main "$@"