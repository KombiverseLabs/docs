#!/bin/bash
# ============================================================
# Kong Gateway Deployment Script
# kombify Platform - Production Deployment
# ============================================================
# This script deploys Kong declarative configuration using deck
# (Kong's declarative configuration tool)
#
# Usage:
#   ./deploy.sh [environment] [kong-admin-url]
#
# Examples:
#   ./deploy.sh prod
#   ./deploy.sh staging http://localhost:8001
#   ./deploy.sh dev http://kong-admin:8001
#
# Environment Variables:
#   KONG_ADMIN_URL    - Kong Admin API URL (default: http://localhost:8001)
#   DECK_VERSION      - deck version to install (default: 1.38.0)
#   REDIS_HOST        - Redis host for rate limiting
#   REDIS_PORT        - Redis port (default: 6380)
#   REDIS_PASSWORD    - Redis password
#   ADMIN_SERVICE_HOST - Administration service host
#   ADMIN_SERVICE_PORT - Administration service port (default: 5380)
#   STACK_SERVICE_HOST - KombiStack service host
#   STACK_SERVICE_PORT - KombiStack service port (default: 5260)
#   SIM_SERVICE_HOST   - KombiSim service host
#   SIM_SERVICE_PORT   - KombiSim service port (default: 5270)
#   SPHERE_SERVICE_HOST - KombiSphere service host
#   SPHERE_SERVICE_PORT - KombiSphere service port (default: 8080)
#
# Exit Codes:
#   0 - Success
#   1 - Validation failed
#   2 - Deployment failed
#   3 - Health check failed
#   4 - Rollback failed
# ============================================================

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/kong-config.yaml"
DECK_VERSION="${DECK_VERSION:-1.38.0}"

# Default values
ENV="${1:-prod}"
KONG_ADMIN_URL="${2:-${KONG_ADMIN_URL:-http://localhost:8001}}"

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

# Print banner
print_banner() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║         Kong Gateway Deployment Script                   ║"
    echo "║         kombify Platform - v1.0.0                        ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    log_info "Environment: ${ENV}"
    log_info "Kong Admin URL: ${KONG_ADMIN_URL}"
    log_info "Config File: ${CONFIG_FILE}"
    echo ""
}

# Check if required environment variables are set
check_env_vars() {
    log_info "Checking environment variables..."
    
    local missing_vars=()
    
    # Required for production
    if [[ "${ENV}" == "prod" ]]; then
        [[ -z "${REDIS_HOST:-}" ]] && missing_vars+=("REDIS_HOST")
        [[ -z "${REDIS_PASSWORD:-}" ]] && missing_vars+=("REDIS_PASSWORD")
    fi
    
    # Service hosts (use defaults if not set)
    export ADMIN_SERVICE_HOST="${ADMIN_SERVICE_HOST:-ca-kombify-admin-prod}"
    export ADMIN_SERVICE_PORT="${ADMIN_SERVICE_PORT:-5380}"
    export STACK_SERVICE_HOST="${STACK_SERVICE_HOST:-ca-kombify-stack-prod}"
    export STACK_SERVICE_PORT="${STACK_SERVICE_PORT:-5260}"
    export SIM_SERVICE_HOST="${SIM_SERVICE_HOST:-ca-kombify-sim-prod}"
    export SIM_SERVICE_PORT="${SIM_SERVICE_PORT:-5270}"
    export SPHERE_SERVICE_HOST="${SPHERE_SERVICE_HOST:-ca-kombify-sphere-prod}"
    export SPHERE_SERVICE_PORT="${SPHERE_SERVICE_PORT:-8080}"
    export REDIS_PORT="${REDIS_PORT:-6380}"
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - ${var}"
        done
        exit 1
    fi
    
    log_success "Environment variables configured"
}

# Install deck if not present
install_deck() {
    log_info "Checking for deck CLI..."
    
    if command -v deck &> /dev/null; then
        local version
        version=$(deck version 2>/dev/null | head -1 || echo "unknown")
        log_info "deck is already installed: ${version}"
        return 0
    fi
    
    log_info "Installing deck v${DECK_VERSION}..."
    
    # Detect OS
    local os
    case "$(uname -s)" in
        Linux*)     os="linux";;
        Darwin*)    os="darwin";;
        CYGWIN*|MINGW*|MSYS*) os="windows";;
        *)          log_error "Unsupported OS: $(uname -s)"; exit 1;;
    esac
    
    # Detect architecture
    local arch
    case "$(uname -m)" in
        x86_64|amd64) arch="amd64";;
        arm64|aarch64) arch="arm64";;
        *)          log_error "Unsupported architecture: $(uname -m)"; exit 1;;
    esac
    
    # Download and install
    local download_url="https://github.com/kong/deck/releases/download/v${DECK_VERSION}/deck_${DECK_VERSION}_${os}_${arch}.tar.gz"
    local temp_dir
    temp_dir=$(mktemp -d)
    
    log_info "Downloading deck from ${download_url}..."
    
    if ! curl -fsSL "${download_url}" -o "${temp_dir}/deck.tar.gz"; then
        log_error "Failed to download deck"
        rm -rf "${temp_dir}"
        exit 1
    fi
    
    log_info "Extracting deck..."
    tar -xzf "${temp_dir}/deck.tar.gz" -C "${temp_dir}"
    
    # Install to /usr/local/bin or ~/.local/bin
    if [[ -w /usr/local/bin ]]; then
        mv "${temp_dir}/deck" /usr/local/bin/deck
        chmod +x /usr/local/bin/deck
        log_success "deck installed to /usr/local/bin/deck"
    else
        mkdir -p ~/.local/bin
        mv "${temp_dir}/deck" ~/.local/bin/deck
        chmod +x ~/.local/bin/deck
        log_success "deck installed to ~/.local/bin/deck"
        log_warning "Make sure ~/.local/bin is in your PATH"
    fi
    
    rm -rf "${temp_dir}"
}

# Substitute environment variables in config
substitute_env_vars() {
    log_info "Substituting environment variables in config..."
    
    local temp_config
    temp_config=$(mktemp)
    
    # Use envsubst to replace variables
    if command -v envsubst &> /dev/null; then
        envsubst < "${CONFIG_FILE}" > "${temp_config}"
    else
        # Fallback: use sed for basic substitution
        cp "${CONFIG_FILE}" "${temp_config}"
        
        # Substitute known variables
        sed -i "s|\${REDIS_HOST}|${REDIS_HOST}|g" "${temp_config}"
        sed -i "s|\${REDIS_PORT}|${REDIS_PORT}|g" "${temp_config}"
        sed -i "s|\${REDIS_PASSWORD}|${REDIS_PASSWORD}|g" "${temp_config}"
        sed -i "s|\${ADMIN_SERVICE_HOST}|${ADMIN_SERVICE_HOST}|g" "${temp_config}"
        sed -i "s|\${ADMIN_SERVICE_PORT}|${ADMIN_SERVICE_PORT}|g" "${temp_config}"
        sed -i "s|\${STACK_SERVICE_HOST}|${STACK_SERVICE_HOST}|g" "${temp_config}"
        sed -i "s|\${STACK_SERVICE_PORT}|${STACK_SERVICE_PORT}|g" "${temp_config}"
        sed -i "s|\${SIM_SERVICE_HOST}|${SIM_SERVICE_HOST}|g" "${temp_config}"
        sed -i "s|\${SIM_SERVICE_PORT}|${SIM_SERVICE_PORT}|g" "${temp_config}"
        sed -i "s|\${SPHERE_SERVICE_HOST}|${SPHERE_SERVICE_HOST}|g" "${temp_config}"
        sed -i "s|\${SPHERE_SERVICE_PORT}|${SPHERE_SERVICE_PORT}|g" "${temp_config}"
    fi
    
    echo "${temp_config}"
}

# Validate configuration
validate_config() {
    local config_file="$1"
    
    log_info "Validating Kong configuration..."
    
    if ! deck validate -s "${config_file}" --kong-addr "${KONG_ADMIN_URL}" 2>&1; then
        log_error "Configuration validation failed"
        return 1
    fi
    
    log_success "Configuration is valid"
    return 0
}

# Dry run deployment
dry_run() {
    local config_file="$1"
    
    log_info "Performing dry run..."
    
    local diff_output
    if ! diff_output=$(deck diff -s "${config_file}" --kong-addr "${KONG_ADMIN_URL}" --non-zero-exit-code 2>&1); then
        if [[ $? -eq 2 ]]; then
            log_error "Dry run failed with errors"
            echo "${diff_output}"
            return 1
        fi
    fi
    
    log_info "Planned changes:"
    echo "${diff_output}"
    
    return 0
}

# Deploy configuration
deploy_config() {
    local config_file="$1"
    
    log_info "Deploying configuration to Kong..."
    
    # Create backup before deploying
    create_backup
    
    if ! deck sync -s "${config_file}" --kong-addr "${KONG_ADMIN_URL}" --force 2>&1; then
        log_error "Deployment failed"
        return 1
    fi
    
    log_success "Configuration deployed successfully"
    return 0
}

# Create backup of current configuration
create_backup() {
    log_info "Creating backup of current configuration..."
    
    local backup_dir="${SCRIPT_DIR}/backups"
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${backup_dir}/kong-config-${timestamp}.yaml"
    
    mkdir -p "${backup_dir}"
    
    if deck dump --kong-addr "${KONG_ADMIN_URL}" -o "${backup_file}" 2>/dev/null; then
        log_success "Backup created: ${backup_file}"
        
        # Keep only last 10 backups
        ls -t "${backup_dir}"/kong-config-*.yaml 2>/dev/null | tail -n +11 | xargs -r rm --
    else
        log_warning "Could not create backup (Kong may be empty)"
    fi
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    local errors=0
    
    # Check services
    log_info "Checking services..."
    local services
    services=$(curl -fsSL "${KONG_ADMIN_URL}/services" 2>/dev/null | grep -o '"name":"[^"]*"' | cut -d'"' -f4 || true)
    
    for service in administration kombistack kombisim kombisphere; do
        if echo "${services}" | grep -q "^${service}$"; then
            log_success "Service '${service}' is configured"
        else
            log_error "Service '${service}' is NOT configured"
            ((errors++))
        fi
    done
    
    # Check routes
    log_info "Checking routes..."
    local routes
    routes=$(curl -fsSL "${KONG_ADMIN_URL}/routes" 2>/dev/null | grep -o '"name":"[^"]*"' | cut -d'"' -f4 || true)
    
    for route in admin-routes kombistack-routes kombisim-routes kombisphere-routes health-route; do
        if echo "${routes}" | grep -q "^${route}$"; then
            log_success "Route '${route}' is configured"
        else
            log_error "Route '${route}' is NOT configured"
            ((errors++))
        fi
    done
    
    # Health check endpoint
    log_info "Testing health endpoint..."
    local health_status
    health_status=$(curl -fsSL -o /dev/null -w "%{http_code}" "${KONG_ADMIN_URL%:8001}:8000/health" 2>/dev/null || echo "000")
    
    if [[ "${health_status}" == "200" ]]; then
        log_success "Health endpoint is responding (HTTP 200)"
    else
        log_error "Health endpoint is NOT responding (HTTP ${health_status})"
        ((errors++))
    fi
    
    # Check Kong status
    log_info "Checking Kong status..."
    local kong_status
    kong_status=$(curl -fsSL "${KONG_ADMIN_URL}/status" 2>/dev/null || echo '{}')
    
    if echo "${kong_status}" | grep -q '"database":"reachable"'; then
        log_success "Kong database is reachable"
    else
        log_warning "Could not verify Kong database status"
    fi
    
    if [[ ${errors} -gt 0 ]]; then
        log_error "Verification failed with ${errors} errors"
        return 1
    fi
    
    log_success "Deployment verified successfully"
    return 0
}

# Rollback to previous configuration
rollback() {
    log_warning "Initiating rollback..."
    
    local backup_dir="${SCRIPT_DIR}/backups"
    local latest_backup
    latest_backup=$(ls -t "${backup_dir}"/kong-config-*.yaml 2>/dev/null | head -1)
    
    if [[ -z "${latest_backup}" ]]; then
        log_error "No backup found for rollback"
        return 1
    fi
    
    log_info "Rolling back to: ${latest_backup}"
    
    if deck sync -s "${latest_backup}" --kong-addr "${KONG_ADMIN_URL}" --force 2>&1; then
        log_success "Rollback completed successfully"
        return 0
    else
        log_error "Rollback failed"
        return 1
    fi
}

# Cleanup function
cleanup() {
    if [[ -n "${TEMP_CONFIG_FILE:-}" && -f "${TEMP_CONFIG_FILE}" ]]; then
        rm -f "${TEMP_CONFIG_FILE}"
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    print_banner
    
    # Check environment variables
    check_env_vars
    
    # Install deck if needed
    install_deck
    
    # Substitute environment variables
    TEMP_CONFIG_FILE=$(substitute_env_vars)
    
    # Validate configuration
    if ! validate_config "${TEMP_CONFIG_FILE}"; then
        exit 1
    fi
    
    # Perform dry run
    if ! dry_run "${TEMP_CONFIG_FILE}"; then
        exit 1
    fi
    
    # Confirm deployment (interactive mode)
    if [[ -t 0 && "${SKIP_CONFIRM:-false}" != "true" ]]; then
        echo ""
        read -p "Proceed with deployment? [y/N] " -n 1 -r
        echo ""
        if [[ ! ${REPLY} =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    # Deploy configuration
    if ! deploy_config "${TEMP_CONFIG_FILE}"; then
        log_error "Deployment failed"
        
        # Attempt rollback
        if [[ "${AUTO_ROLLBACK:-false}" == "true" ]]; then
            rollback
        fi
        
        exit 2
    fi
    
    # Verify deployment
    if ! verify_deployment; then
        log_error "Verification failed"
        
        # Attempt rollback
        if [[ "${AUTO_ROLLBACK:-false}" == "true" ]]; then
            rollback
        fi
        
        exit 3
    fi
    
    log_success "Deployment completed successfully!"
    echo ""
    log_info "Summary:"
    echo "  Environment: ${ENV}"
    echo "  Kong Admin: ${KONG_ADMIN_URL}"
    echo "  Services: administration, kombistack, kombisim, kombisphere"
    echo ""
}

# Run main function
main "$@"
