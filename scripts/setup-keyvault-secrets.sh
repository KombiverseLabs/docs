#!/bin/bash
# ============================================================
# Azure Key Vault Secrets Setup Script
# kombify Platform - Kong + Zitadel Integration
# ============================================================
# This script checks and adds required secrets to kv-kombify-prod
#
# Usage:
#   ./setup-keyvault-secrets.sh
#
# Prerequisites:
#   - Azure CLI installed and logged in
#   - Access to kv-kombify-prod Key Vault
# ============================================================

set -euo pipefail

# Configuration
KEYVAULT_NAME="kv-kombify-prod"
RESOURCE_GROUP="rg-kombify-prod"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Azure CLI is installed and logged in
check_azure_cli() {
    log_info "Checking Azure CLI..."
    
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if logged in
    if ! az account show &> /dev/null; then
        log_error "Not logged in to Azure. Please run 'az login' first."
        exit 1
    fi
    
    log_success "Azure CLI is ready"
}

# Check if Key Vault exists
check_keyvault() {
    log_info "Checking Key Vault: ${KEYVAULT_NAME}..."
    
    if ! az keyvault show --name "${KEYVAULT_NAME}" --resource-group "${RESOURCE_GROUP}" &> /dev/null; then
        log_error "Key Vault ${KEYVAULT_NAME} not found in resource group ${RESOURCE_GROUP}"
        exit 1
    fi
    
    log_success "Key Vault is accessible"
}

# Check if secret exists in Key Vault
secret_exists() {
    local secret_name="$1"
    az keyvault secret show --vault-name "${KEYVAULT_NAME}" --name "${secret_name}" &> /dev/null
}

# Add or update secret in Key Vault
add_secret() {
    local secret_name="$1"
    local secret_value="$2"
    local description="$3"
    
    log_info "Adding secret: ${secret_name}"
    
    if az keyvault secret set --vault-name "${KEYVAULT_NAME}" --name "${secret_name}" --value "${secret_value}" --description "${description}" &> /dev/null; then
        log_success "Secret '${secret_name}' added/updated successfully"
        return 0
    else
        log_error "Failed to add secret '${secret_name}'"
        return 1
    fi
}

# Main function
main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║    Azure Key Vault Secrets Setup - Kong + Zitadel       ║"
    echo "║    Key Vault: ${KEYVAULT_NAME}                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    
    # Check prerequisites
    check_azure_cli
    check_keyvault
    
    log_info "Checking and adding secrets..."
    echo ""
    
    local added_count=0
    local existing_count=0
    local failed_count=0
    
    # Secret 1: zitadel-issuer
    if secret_exists "zitadel-issuer"; then
        log_warning "Secret 'zitadel-issuer' already exists"
        ((existing_count++))
    else
        if add_secret "zitadel-issuer" "https://auth.kombisphere.io" "Zitadel OIDC issuer URL"; then
            ((added_count++))
        else
            ((failed_count++))
        fi
    fi
    
    # Secret 2: zitadel-client-id
    if secret_exists "zitadel-client-id"; then
        log_warning "Secret 'zitadel-client-id' already exists"
        ((existing_count++))
    else
        log_warning "Secret 'zitadel-client-id' needs to be added manually from Zitadel console"
        echo "      Go to: https://auth.kombisphere.io/ui/console"
        echo "      Navigate to your project > Applications > KombiSphere-Cloud"
        echo "      Copy the Client ID and run:"
        echo "      az keyvault secret set --vault-name ${KEYVAULT_NAME} --name zitadel-client-id --value 'YOUR_CLIENT_ID'"
        ((existing_count++))
    fi
    
    # Secret 3: zitadel-client-secret
    if secret_exists "zitadel-client-secret"; then
        log_warning "Secret 'zitadel-client-secret' already exists"
        ((existing_count++))
    else
        log_warning "Secret 'zitadel-client-secret' needs to be added manually from Zitadel console"
        echo "      Go to: https://auth.kombisphere.io/ui/console"
        echo "      Navigate to your project > Applications > KombiSphere-Cloud"
        echo "      Copy the Client Secret and run:"
        echo "      az keyvault secret set --vault-name ${KEYVAULT_NAME} --name zitadel-client-secret --value 'YOUR_CLIENT_SECRET'"
        ((existing_count++))
    fi
    
    # Secret 4: stripe-secret-key
    if secret_exists "stripe-secret-key"; then
        log_warning "Secret 'stripe-secret-key' already exists"
        ((existing_count++))
    else
        log_warning "Secret 'stripe-secret-key' needs to be added manually from Stripe dashboard"
        echo "      Go to: https://dashboard.stripe.com/apikeys"
        echo "      Copy the Secret key and run:"
        echo "      az keyvault secret set --vault-name ${KEYVAULT_NAME} --name stripe-secret-key --value 'sk_...'"
        ((existing_count++))
    fi
    
    # Secret 5: stripe-webhook-secret
    if secret_exists "stripe-webhook-secret"; then
        log_warning "Secret 'stripe-webhook-secret' already exists"
        ((existing_count++))
    else
        log_warning "Secret 'stripe-webhook-secret' needs to be added manually from Stripe webhook settings"
        echo "      Go to: https://dashboard.stripe.com/webhooks"
        echo "      Copy the Signing secret and run:"
        echo "      az keyvault secret set --vault-name ${KEYVAULT_NAME} --name stripe-webhook-secret --value 'whsec_...'"
        ((existing_count++))
    fi
    
    # Secret 6: zitadel-webhook-secret
    if secret_exists "zitadel-webhook-secret"; then
        log_warning "Secret 'zitadel-webhook-secret' already exists"
        ((existing_count++))
    else
        log_warning "Secret 'zitadel-webhook-secret' needs to be added manually from Zitadel webhook settings"
        echo "      Go to: https://auth.kombisphere.io/ui/console"
        echo "      Navigate to your project > Webhooks"
        echo "      Generate a webhook secret and run:"
        echo "      az keyvault secret set --vault-name ${KEYVAULT_NAME} --name zitadel-webhook-secret --value 'YOUR_WEBHOOK_SECRET'"
        ((existing_count++))
    fi
    
    # Secret 7: jwt-secret
    if secret_exists "jwt-secret"; then
        log_warning "Secret 'jwt-secret' already exists"
        ((existing_count++))
    else
        # Generate a secure JWT secret
        JWT_SECRET=$(openssl rand -base64 64 2>/dev/null || head -c 64 /dev/urandom | base64)
        if add_secret "jwt-secret" "${JWT_SECRET}" "JWT signing secret for service-to-service authentication"; then
            ((added_count++))
        else
            ((failed_count++))
        fi
    fi
    
    # Secret 8: session-secret
    if secret_exists "session-secret"; then
        log_warning "Secret 'session-secret' already exists"
        ((existing_count++))
    else
        # Generate a secure session secret
        SESSION_SECRET=$(openssl rand -base64 64 2>/dev/null || head -c 64 /dev/urandom | base64)
        if add_secret "session-secret" "${SESSION_SECRET}" "Session management secret for cookie signing"; then
            ((added_count++))
        else
            ((failed_count++))
        fi
    fi
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                    Summary                               ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    log_success "Secrets added: ${added_count}"
    log_warning "Secrets already existing: ${existing_count}"
    if [ ${failed_count} -gt 0 ]; then
        log_error "Secrets failed: ${failed_count}"
    fi
    echo ""
    log_info "Key Vault secrets verification complete!"
    echo ""
    log_info "To verify all secrets:"
    echo "  az keyvault secret list --vault-name ${KEYVAULT_NAME} --output table"
    echo ""
}

# Run main function
main "$@"