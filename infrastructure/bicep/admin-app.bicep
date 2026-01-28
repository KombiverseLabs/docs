// =============================================================================
// KombiSphere-Admin Container App Bicep Template
// =============================================================================
// Deploys the KombiSphere-Admin service (Go + PocketBase) to Azure Container Apps
//
// Deployment: az deployment group create -g rg-kombify-prod -f admin-app.bicep
// =============================================================================

@description('Environment name')
param environment string = 'prod'

@description('Azure region')
param location string = resourceGroup().location

@description('Container App name')
param appName string = 'ca-kombify-admin-prod'

@description('Container image')
param image string = 'acrkombifyprod.azurecr.io/kombisphere-admin:latest'

@description('Container App Environment ID')
param containerAppEnvironmentId string

@description('Managed Identity ID')
param managedIdentityId string

@description('Managed Identity Client ID')
param managedIdentityClientId string

@description('Key Vault name')
param keyVaultName string

@description('Application Insights connection string')
param appInsightsConnectionString string = ''

@description('Minimum replicas')
param minReplicas int = 1

@description('Maximum replicas')
param maxReplicas int = 2

@description('CPU allocation')
param cpu string = '0.5'

@description('Memory allocation')
param memory string = '1Gi'

@description('Data volume size in GB')
param dataVolumeSize int = 10

@description('HTTP port')
param httpPort int = 8090

var tags = {
  Environment: environment
  Project: 'kombify'
  ManagedBy: 'bicep'
  CostCenter: 'platform'
  Service: 'admin'
}

// Reference existing Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// Container App
resource adminApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
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
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: false
        targetPort: httpPort
        transport: 'http'
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      secrets: [
        {
          name: 'meilisearch-url'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/meilisearch-url'
          identity: managedIdentityId
        }
        {
          name: 'meilisearch-api-key'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/meilisearch-api-key'
          identity: managedIdentityId
        }
        {
          name: 'admin-api-key'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/admin-api-key'
          identity: managedIdentityId
        }
        {
          name: 'github-pat'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/github-pat'
          identity: managedIdentityId
        }
        {
          name: 'appinsights-connection'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/appinsights-connection'
          identity: managedIdentityId
        }
      ]
      registries: [
        {
          server: 'acrkombifyprod.azurecr.io'
          identity: managedIdentityId
        }
      ]
    }
    template: {
      revisionSuffix: uniqueString(resourceGroup().id, deployment().name)
      containers: [
        {
          name: 'kombisphere-admin'
          image: image
          resources: {
            cpu: json(cpu)
            memory: memory
          }
          env: [
            {
              name: 'PORT'
              value: string(httpPort)
            }
            {
              name: 'KOMBISPHERE_DATA_DIR'
              value: '/data'
            }
            {
              name: 'KOMBISPHERE_ENV'
              value: 'production'
            }
            {
              name: 'MEILISEARCH_URL'
              secretRef: 'meilisearch-url'
            }
            {
              name: 'MEILISEARCH_API_KEY'
              secretRef: 'meilisearch-api-key'
            }
            {
              name: 'ADMIN_API_KEY'
              secretRef: 'admin-api-key'
            }
            {
              name: 'GITHUB_TOKEN'
              secretRef: 'github-pat'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              secretRef: 'appinsights-connection'
            }
            {
              name: 'KOMBISPHERE_STATIC_DIR'
              value: '/app/static'
            }
            {
              name: 'KOMBISPHERE_CRAWLER_ENABLED'
              value: 'true'
            }
          ]
          volumeMounts: [
            {
              volumeName: 'data-volume'
              mountPath: '/data'
            }
          ]
          probes: [
            {
              type: 'liveness'
              httpGet: {
                path: '/health'
                port: httpPort
                scheme: 'HTTP'
              }
              initialDelaySeconds: 30
              periodSeconds: 30
              timeoutSeconds: 10
              failureThreshold: 3
              successThreshold: 1
            }
            {
              type: 'readiness'
              httpGet: {
                path: '/health'
                port: httpPort
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 3
              successThreshold: 1
            }
            {
              type: 'startup'
              httpGet: {
                path: '/health'
                port: httpPort
                scheme: 'HTTP'
              }
              initialDelaySeconds: 5
              periodSeconds: 5
              timeoutSeconds: 5
              failureThreshold: 30
              successThreshold: 1
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-rule'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
          {
            name: 'cpu-rule'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '70'
              }
            }
          }
        ]
      }
      volumes: [
        {
          name: 'data-volume'
          storageType: 'EmptyDir'
        }
      ]
    }
  }
}

// Outputs
@description('Container App FQDN')
output fqdn string = adminApp.properties.configuration.ingress.fqdn

@description('Container App URL')
output url string = 'http://${adminApp.properties.configuration.ingress.fqdn}'

@description('Container App name')
output containerAppName string = adminApp.name

@description('Latest revision name')
output latestRevision string = adminApp.properties.latestRevisionName
