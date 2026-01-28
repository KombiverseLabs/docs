// =============================================================================
// Kong Container App Module
// =============================================================================
// This module deploys Kong Gateway as an Azure Container App with:
// - Container configuration for Kong Gateway
// - Environment variables from Key Vault secrets
// - Health probes (liveness, readiness, startup)
// - Volume mounts for config
// - Auto-scaling configuration
// =============================================================================

// -----------------------------------------------------------------------------
// Parameters
// -----------------------------------------------------------------------------

@description('Name of the Container App')
param name string

@description('Azure region')
param location string = resourceGroup().location

@description('Resource tags')
param tags object = {}

@description('Environment name')
param environment string

@description('Container App Environment ID')
param containerAppEnvironmentId string

@description('Managed Identity Resource ID')
param managedIdentityId string

@description('Managed Identity Client ID')
param managedIdentityClientId string

@description('Key Vault name')
param keyVaultName string

@description('Kong Docker image')
param kongImage string = 'kong:3.9'

@description('Minimum replicas')
param minReplicas int = 2

@description('Maximum replicas')
param maxReplicas int = 5

@description('CPU allocation')
param cpu string = '1'

@description('Memory allocation')
param memory string = '2Gi'

@description('Redis host')
param redisHost string

@description('Zitadel issuer URL')
param zitadelIssuer string

@description('Zitadel JWKS URL')
param zitadelJwksUrl string

@description('PostgreSQL host')
param postgresHost string

@description('PostgreSQL user')
param postgresUser string

@description('Application Insights connection string')
param appInsightsConnectionString string = ''

@description('Kong log level')
@allowed(['debug', 'info', 'notice', 'warn', 'error', 'crit'])
param logLevel string = 'info'

@description('Enable proxy access log')
param enableProxyAccessLog bool = true

@description('Enable admin access log')
param enableAdminAccessLog bool = true

@description('Kong proxy listen address')
param proxyListen string = '0.0.0.0:8000'

@description('Kong admin listen address')
param adminListen string = '0.0.0.0:8001'

@description('Kong plugins to enable')
param kongPlugins string = 'bundled,jwt,rate-limiting,cors,request-transformer,prometheus,correlation-id,rate-limiting-advanced'

@description('Kong database')
param kongDatabase string = 'postgres'

@description('Kong PostgreSQL database name')
param kongPostgresDatabase string = 'kong'

@description('Kong PostgreSQL port')
param kongPostgresPort string = '5432'

@description('Kong PostgreSQL SSL mode')
param kongPostgresSsl string = 'on'

@description('Kong PostgreSQL SSL verify')
param kongPostgresSslVerify string = 'off'

@description('Redis port')
param redisPort string = '6380'

@description('Redis SSL enabled')
param redisSsl string = 'true'

@description('Liveness probe initial delay seconds')
param livenessInitialDelaySeconds int = 30

@description('Liveness probe period seconds')
param livenessPeriodSeconds int = 10

@description('Liveness probe timeout seconds')
param livenessTimeoutSeconds int = 5

@description('Liveness probe failure threshold')
param livenessFailureThreshold int = 3

@description('Readiness probe initial delay seconds')
param readinessInitialDelaySeconds int = 5

@description('Readiness probe period seconds')
param readinessPeriodSeconds int = 5

@description('Readiness probe timeout seconds')
param readinessTimeoutSeconds int = 3

@description('Readiness probe failure threshold')
param readinessFailureThreshold int = 3

@description('Startup probe initial delay seconds')
param startupInitialDelaySeconds int = 10

@description('Startup probe period seconds')
param startupPeriodSeconds int = 5

@description('Startup probe timeout seconds')
param startupTimeoutSeconds int = 3

@description('Startup probe failure threshold')
param startupFailureThreshold int = 12

@description('CPU scaling threshold percentage')
param cpuScalingThreshold int = 70

@description('Memory scaling threshold percentage')
param memoryScalingThreshold int = 80

@description('HTTP scaling concurrent requests')
param httpScalingRequests int = 100

// -----------------------------------------------------------------------------
// Existing Resources
// -----------------------------------------------------------------------------

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// -----------------------------------------------------------------------------
// Container App
// -----------------------------------------------------------------------------

resource kongContainerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppEnvironmentId
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8000
        transport: 'auto'
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
        allowInsecure: false
        stickySessions: {
          affinity: 'none'
        }
      }
      secrets: [
        {
          name: 'kong-pg-host'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/kong-pg-host'
          identity: managedIdentityId
        }
        {
          name: 'kong-pg-user'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/kong-pg-user'
          identity: managedIdentityId
        }
        {
          name: 'kong-pg-password'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/kong-pg-password'
          identity: managedIdentityId
        }
        {
          name: 'kong-pg-database'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/kong-pg-database'
          identity: managedIdentityId
        }
        {
          name: 'redis-password'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/redis-password'
          identity: managedIdentityId
        }
        {
          name: 'redis-host'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/redis-host'
          identity: managedIdentityId
        }
        {
          name: 'kong-admin-token'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/kong-admin-token'
          identity: managedIdentityId
        }
      ]
      registries: []
    }
    template: {
      containers: [
        {
          name: 'kong'
          image: kongImage
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          env: [
            // Database Configuration
            {
              name: 'KONG_DATABASE'
              value: kongDatabase
            }
            {
              name: 'KONG_PG_HOST'
              secretRef: 'kong-pg-host'
            }
            {
              name: 'KONG_PG_USER'
              secretRef: 'kong-pg-user'
            }
            {
              name: 'KONG_PG_PASSWORD'
              secretRef: 'kong-pg-password'
            }
            {
              name: 'KONG_PG_DATABASE'
              secretRef: 'kong-pg-database'
            }
            {
              name: 'KONG_PG_PORT'
              value: kongPostgresPort
            }
            {
              name: 'KONG_PG_SSL'
              value: kongPostgresSsl
            }
            {
              name: 'KONG_PG_SSL_VERIFY'
              value: kongPostgresSslVerify
            }
            // Kong Core Configuration
            {
              name: 'KONG_PLUGINS'
              value: kongPlugins
            }
            {
              name: 'KONG_PROXY_LISTEN'
              value: proxyListen
            }
            {
              name: 'KONG_ADMIN_LISTEN'
              value: adminListen
            }
            // Logging Configuration
            {
              name: 'KONG_PROXY_ACCESS_LOG'
              value: enableProxyAccessLog ? '/dev/stdout' : 'off'
            }
            {
              name: 'KONG_ADMIN_ACCESS_LOG'
              value: enableAdminAccessLog ? '/dev/stdout' : 'off'
            }
            {
              name: 'KONG_PROXY_ERROR_LOG'
              value: '/dev/stderr'
            }
            {
              name: 'KONG_ADMIN_ERROR_LOG'
              value: '/dev/stderr'
            }
            {
              name: 'KONG_LOG_LEVEL'
              value: logLevel
            }
            // Redis Configuration for Rate Limiting
            {
              name: 'REDIS_HOST'
              secretRef: 'redis-host'
            }
            {
              name: 'REDIS_PORT'
              value: redisPort
            }
            {
              name: 'REDIS_PASSWORD'
              secretRef: 'redis-password'
            }
            {
              name: 'REDIS_SSL'
              value: redisSsl
            }
            // Zitadel OIDC Configuration
            {
              name: 'ZITADEL_ISSUER'
              value: zitadelIssuer
            }
            {
              name: 'ZITADEL_JWKS_URL'
              value: zitadelJwksUrl
            }
            // Kong Admin API Security
            {
              name: 'KONG_ADMIN_ACCESS_LOG'
              value: '/dev/stdout'
            }
            {
              name: 'KONG_ADMIN_GUI_PATH'
              value: '/'
            }
            {
              name: 'KONG_ADMIN_GUI_URL'
              value: 'https://admin.kombify.io'
            }
            // Declarative Config (optional)
            {
              name: 'KONG_DECLARATIVE_CONFIG'
              value: ''
            }
            // Application Insights (if provided)
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsightsConnectionString
            }
            // Managed Identity Client ID for Key Vault access
            {
              name: 'AZURE_CLIENT_ID'
              value: managedIdentityClientId
            }
          ]
          // Health Probes
          probes: [
            // Liveness Probe - Restarts container if unhealthy
            {
              type: 'Liveness'
              httpGet: {
                path: '/status'
                port: 8001
                httpHeaders: []
              }
              initialDelaySeconds: livenessInitialDelaySeconds
              periodSeconds: livenessPeriodSeconds
              timeoutSeconds: livenessTimeoutSeconds
              failureThreshold: livenessFailureThreshold
              successThreshold: 1
            }
            // Readiness Probe - Removes from load balancer if not ready
            {
              type: 'Readiness'
              httpGet: {
                path: '/status'
                port: 8001
                httpHeaders: []
              }
              initialDelaySeconds: readinessInitialDelaySeconds
              periodSeconds: readinessPeriodSeconds
              timeoutSeconds: readinessTimeoutSeconds
              failureThreshold: readinessFailureThreshold
              successThreshold: 1
            }
            // Startup Probe - Gives time for slow startup
            {
              type: 'Startup'
              httpGet: {
                path: '/status'
                port: 8001
                httpHeaders: []
              }
              initialDelaySeconds: startupInitialDelaySeconds
              periodSeconds: startupPeriodSeconds
              timeoutSeconds: startupTimeoutSeconds
              failureThreshold: startupFailureThreshold
              successThreshold: 1
            }
          ]
          volumeMounts: []
        }
      ]
      initContainers: []
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'cpu-scaling'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: string(cpuScalingThreshold)
              }
            }
          }
          {
            name: 'memory-scaling'
            custom: {
              type: 'memory'
              metadata: {
                type: 'Utilization'
                value: string(memoryScalingThreshold)
              }
            }
          }
          {
            name: 'http-scaling'
            custom: {
              type: 'http'
              metadata: {
                concurrentRequests: string(httpScalingRequests)
              }
            }
          }
        ]
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------

@description('Kong Container App ID')
output containerAppId string = kongContainerApp.id

@description('Kong Container App name')
output containerAppName string = kongContainerApp.name

@description('Kong Container App FQDN')
output fqdn string = kongContainerApp.properties.configuration.ingress.fqdn

@description('Kong Container App URL')
output url string = 'https://${kongContainerApp.properties.configuration.ingress.fqdn}'

@description('Latest revision name')
output latestRevisionName string = kongContainerApp.properties.latestRevisionName

@description('Managed Identity Principal ID')
output managedIdentityPrincipalId string = managedIdentityId
