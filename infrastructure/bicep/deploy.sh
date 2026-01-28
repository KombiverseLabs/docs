#!/bin/bash
# =============================================================================
# Kong Gateway Infrastructure Deployment Script
# =============================================================================
# This script deploys the complete Kong Gateway infrastructure to Azure
# including PostgreSQL, Redis, Container Apps, and Front Door.
#
# Usage: ./deploy.sh [environment] [location] [additional-options]
# Example: ./deploy.sh prod westeurope
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default values
ENVIRONMENT="${1:-prod}"
LOCATION="${2:-westeurope}"
SKIP_CONFIRMATION="${SKIP_CONFIRM:-false}"
DRY_RUN="${DRY_RUN:-false}"
VALIDATE_ONLY="${VALIDATE_ONLY:-false}"
WHAT_IF="${WHAT_IF:-false}"

# Resource naming
RG="rg-kombify-${ENVIRONMENT}"
DEPLOYMENT_NAME="kong-infra-${ENVIRONMENT}-$(date +%Y%m%d%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

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

print_banner() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║         Kong Gateway Infrastructure Deployment                 ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
}

print_summary() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    Deployment Summary                          ║"
    echo "╠════════════════════════════════════════════════════════════════╣"
    echo "║  Environment:    ${ENVIRONMENT}"
    echo "║  Location:       ${LOCATION}"
    echo "║  Resource Group: ${RG}"
    echo "║  Deployment:     ${DEPLOYMENT_NAME}"
    echo "║  Bicep File:     ${SCRIPT_DIR}/main.bicep"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
}

# -----------------------------------------------------------------------------
# Validation Functions
# -----------------------------------------------------------------------------

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed. Please install it from: https://aka.ms/installazurecliwindows"
        exit 1
    fi
    
    # Check Azure CLI version
    AZ_VERSION=$(az version --query '"azure-cli"' -o tsv)
    log_info "Azure CLI version: ${AZ_VERSION}"
    
    # Check Bicep
    if ! az bicep version &> /dev/null; then
        log_info "Installing Bicep..."
        az bicep install
    fi
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed. Some features may not work correctly."
    fi
    
    log_success "Prerequisites check passed"
}

check_azure_login() {
    log_info "Checking Azure login status..."
    
    if ! az account show &> /dev/null; then
        log_error "Not logged into Azure. Please run 'az login' first."
        exit 1
    fi
    
    ACCOUNT=$(az account show --query 'name' -o tsv)
    SUBSCRIPTION_ID=$(az account show --query 'id' -o tsv)
    log_info "Logged in as: ${ACCOUNT} (${SUBSCRIPTION_ID})"
}

validate_parameters() {
    log_info "Validating parameters..."
    
    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
        log_error "Invalid environment: ${ENVIRONMENT}. Must be one of: dev, staging, prod"
        exit 1
    fi
    
    # Validate location
    VALID_LOCATIONS=$(az account list-locations --query "[].name" -o tsv)
    if [[ ! "$VALID_LOCATIONS" =~ "$LOCATION" ]]; then
        log_error "Invalid location: ${LOCATION}"
        exit 1
    fi
    
    # Check Bicep file exists
    if [[ ! -f "${SCRIPT_DIR}/main.bicep" ]]; then
        log_error "main.bicep not found in ${SCRIPT_DIR}"
        exit 1
    fi
    
    # Check for PostgreSQL password
    if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
        log_warning "POSTGRES_PASSWORD environment variable not set"
        log_info "A random password will be generated"
        POSTGRES_PASSWORD=$(openssl rand -base64 32 2>/dev/null || head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32)
        export POSTGRES_PASSWORD
    fi
    
    log_success "Parameter validation passed"
}

# -----------------------------------------------------------------------------
# Deployment Functions
# -----------------------------------------------------------------------------

create_resource_group() {
    log_info "Creating resource group: ${RG} in ${LOCATION}..."
    
    if az group show --name "${RG}" &> /dev/null; then
        log_warning "Resource group ${RG} already exists"
    else
        az group create \
            --name "${RG}" \
            --location "${LOCATION}" \
            --tags Environment="${ENVIRONMENT}" Project=kombify ManagedBy=Bicep
        log_success "Resource group created"
    fi
}

validate_bicep() {
    log_info "Validating Bicep templates..."
    
    cd "${SCRIPT_DIR}"
    
    # Validate main.bicep
    if ! az bicep build --file main.bicep &> /dev/null; then
        log_error "Bicep validation failed for main.bicep"
        az bicep build --file main.bicep
        exit 1
    fi
    
    # Validate modules
    for file in *.bicep; do
        if [[ -f "$file" ]]; then
            log_info "Validating ${file}..."
            if ! az bicep build --file "$file" &> /dev/null; then
                log_error "Bicep validation failed for ${file}"
                exit 1
            fi
        fi
    done
    
    log_success "All Bicep templates validated successfully"
}

run_what_if() {
    log_info "Running what-if deployment..."
    
    cd "${SCRIPT_DIR}"
    
    az deployment group what-if \
        --resource-group "${RG}" \
        --template-file main.bicep \
        --parameters \
            environment="${ENVIRONMENT}" \
            location="${LOCATION}" \
            postgresAdminPassword="${POSTGRES_PASSWORD}" \
        --output table
    
    echo ""
    read -p "Do you want to proceed with the deployment? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi
}

deploy_infrastructure() {
    log_info "Deploying infrastructure..."
    
    cd "${SCRIPT_DIR}"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Dry run mode - not deploying"
        az deployment group validate \
            --resource-group "${RG}" \
            --template-file main.bicep \
            --parameters \
                environment="${ENVIRONMENT}" \
                location="${LOCATION}" \
                postgresAdminPassword="${POSTGRES_PASSWORD}"
        log_success "Validation successful"
        return
    fi
    
    if [[ "$WHAT_IF" == "true" ]]; then
        run_what_if
    fi
    
    # Confirm deployment
    if [[ "$SKIP_CONFIRMATION" != "true" ]]; then
        echo ""
        read -p "Deploy infrastructure to ${ENVIRONMENT} environment? (y/N): " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled by user"
            exit 0
        fi
    fi
    
    # Deploy
    log_info "Starting deployment: ${DEPLOYMENT_NAME}"
    
    az deployment group create \
        --name "${DEPLOYMENT_NAME}" \
        --resource-group "${RG}" \
        --template-file main.bicep \
        --parameters \
            environment="${ENVIRONMENT}" \
            location="${LOCATION}" \
            postgresAdminPassword="${POSTGRES_PASSWORD}" \
        --output json > "${SCRIPT_DIR}/deployment-output.json"
    
    log_success "Deployment completed successfully"
}

# -----------------------------------------------------------------------------
# Post-Deployment Functions
# -----------------------------------------------------------------------------

extract_outputs() {
    log_info "Extracting deployment outputs..."
    
    if [[ -f "${SCRIPT_DIR}/deployment-output.json" ]]; then
        OUTPUTS=$(cat "${SCRIPT_DIR}/deployment-output.json")
        
        KONG_FQDN=$(echo "$OUTPUTS" | jq -r '.properties.outputs.kongFqdn.value // "N/A"')
        KONG_URL=$(echo "$OUTPUTS" | jq -r '.properties.outputs.kongUrl.value // "N/A"')
        FRONTDOOR_HOSTNAME=$(echo "$OUTPUTS" | jq -r '.properties.outputs.frontDoorHostname.value // "N/A"')
        KEYVAULT_NAME=$(echo "$OUTPUTS" | jq -r '.properties.outputs.keyVaultName.value // "N/A"')
        
        echo ""
        echo "╔════════════════════════════════════════════════════════════════╗"
        echo "║                Deployment Outputs                              ║"
        echo "╠════════════════════════════════════════════════════════════════╣"
        echo "║  Kong FQDN:          ${KONG_FQDN}"
        echo "║  Kong URL:           ${KONG_URL}"
        echo "║  Front Door Host:    ${FRONTDOOR_HOSTNAME}"
        echo "║  Key Vault:          ${KEYVAULT_NAME}"
        echo "╚════════════════════════════════════════════════════════════════╝"
        echo ""
        
        # Save outputs to file
        cat > "${SCRIPT_DIR}/deployment-outputs-${ENVIRONMENT}.txt" << EOF
Kong FQDN: ${KONG_FQDN}
Kong URL: ${KONG_URL}
Front Door Hostname: ${FRONTDOOR_HOSTNAME}
Key Vault Name: ${KEYVAULT_NAME}
Resource Group: ${RG}
Environment: ${ENVIRONMENT}
Deployed At: $(date -Iseconds)
EOF
        
        log_success "Outputs saved to deployment-outputs-${ENVIRONMENT}.txt"
    else
        log_warning "Deployment output file not found"
    fi
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check resource group
    if ! az group show --name "${RG}" &> /dev/null; then
        log_error "Resource group ${RG} not found"
        return 1
    fi
    
    # Check Container App
    CA_NAME="ca-kong-kombify-${ENVIRONMENT}"
    if az containerapp show --name "${CA_NAME}" --resource-group "${RG}" &> /dev/null; then
        log_success "Container App ${CA_NAME} exists"
        
        # Check health endpoint
        FQDN=$(az containerapp show --name "${CA_NAME}" --resource-group "${RG}" --query properties.configuration.ingress.fqdn -o tsv)
        log_info "Checking health endpoint: https://${FQDN}/health"
        
        # Note: This may fail if network restrictions are in place
        if curl -sf "https://${FQDN}/health" &> /dev/null; then
            log_success "Health endpoint is responding"
        else
            log_warning "Health endpoint not accessible (may be due to network restrictions)"
        fi
    else
        log_error "Container App ${CA_NAME} not found"
    fi
    
    # Check PostgreSQL
    PG_NAME="psql-kombify-${ENVIRONMENT}"
    if az postgres flexible-server show --name "${PG_NAME}" --resource-group "${RG}" &> /dev/null; then
        log_success "PostgreSQL server ${PG_NAME} exists"
    else
        log_error "PostgreSQL server ${PG_NAME} not found"
    fi
    
    # Check Redis
    REDIS_NAME="redis-kombify-${ENVIRONMENT}"
    if az redis show --name "${REDIS_NAME}" --resource-group "${RG}" &> /dev/null; then
        log_success "Redis cache ${REDIS_NAME} exists"
    else
        log_error "Redis cache ${REDIS_NAME} not found"
    fi
    
    log_success "Verification complete"
}

run_kong_migrations() {
    log_info "Running Kong database migrations..."
    
    CA_NAME="ca-kong-kombify-${ENVIRONMENT}"
    
    # Check if migrations are needed
    log_info "Checking if Kong migrations are required..."
    
    # Create a temporary job for migrations
    MIGRATION_JOB="kong-migrations-${ENVIRONMENT}"
    
    # Get the image from the existing container app
    IMAGE=$(az containerapp show --name "${CA_NAME}" --resource-group "${RG}" --query 'properties.template.containers[0].image' -o tsv)
    
    log_info "Creating migration job with image: ${IMAGE}"
    
    # Note: In production, you might want to run migrations as part of the deployment
    # or use a separate process. This is a simplified example.
    log_warning "Kong migrations should be run manually or via CI/CD pipeline"
    log_info "Command to run migrations:"
    echo "  kubectl run kong-migrations --rm -i --restart=Never --image=${IMAGE} -- kong migrations bootstrap"
}

# -----------------------------------------------------------------------------
# Main Script
# -----------------------------------------------------------------------------

show_help() {
    cat << EOF
Kong Gateway Infrastructure Deployment Script

Usage: ./deploy.sh [environment] [location] [options]

Arguments:
  environment    Target environment (dev, staging, prod) [default: prod]
  location       Azure region (e.g., westeurope, eastus) [default: westeurope]

Options:
  SKIP_CONFIRM=true    Skip confirmation prompts
  DRY_RUN=true         Validate templates without deploying
  WHAT_IF=true         Show what-if changes before deploying
  VALIDATE_ONLY=true   Only validate Bicep templates

Environment Variables:
  POSTGRES_PASSWORD    PostgreSQL admin password (auto-generated if not set)

Examples:
  ./deploy.sh prod westeurope
  ./deploy.sh dev westeurope SKIP_CONFIRM=true
  DRY_RUN=true ./deploy.sh staging eastus
  WHAT_IF=true ./deploy.sh prod westeurope

EOF
}

main() {
    # Show help if requested
    if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
        show_help
        exit 0
    fi
    
    print_banner
    print_summary
    
    # Run checks
    check_prerequisites
    check_azure_login
    validate_parameters
    
    # Validate Bicep templates
    validate_bicep
    
    if [[ "$VALIDATE_ONLY" == "true" ]]; then
        log_info "Validation only mode - exiting"
        exit 0
    fi
    
    # Create resource group
    create_resource_group
    
    # Deploy infrastructure
    deploy_infrastructure
    
    # Extract outputs
    extract_outputs
    
    # Verify deployment
    verify_deployment
    
    # Run migrations (optional)
    # run_kong_migrations
    
    echo ""
    log_success "Deployment process completed!"
    echo ""
    echo "Next steps:"
    echo "  1. Configure DNS records for api.kombify.io -> Front Door"
    echo "  2. Deploy Kong configuration using: cd ../kong && ./deploy.sh ${ENVIRONMENT}"
    echo "  3. Verify health endpoint: curl https://api.kombify.io/health"
    echo ""
}

# Run main function
main "$@"
