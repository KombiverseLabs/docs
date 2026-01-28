// =============================================================================
// Main Bicep Template - Kong Gateway Infrastructure
// =============================================================================
// This template deploys the complete Kong Gateway infrastructure including:
// - PostgreSQL Flexible Server for Kong config database
// - Redis Cache for distributed rate limiting
// - Container App Environment with VNet integration
// - Kong Container App with health probes
// - Managed Identity with Key Vault access
// - Auto-scaling (2-5 replicas)
//
// Deployment: az deployment group create -g rg-kombify-prod -f main.bicep
// =============================================================================

// -----------------------------------------------------------------------------
// Parameters
// -----------------------------------------------------------------------------

@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'prod'

@description('Azure region for deployment')
param location string = resourceGroup().location

@description('Kong Docker image tag')
param kongImage string = 'kong:3.9'

@description('PostgreSQL admin username')
param postgresAdminUser string = 'kongadmin'

@description('PostgreSQL admin password')
@secure()
param postgresAdminPassword string

@description('Redis SKU name')
@allowed(['Basic', 'Standard', 'Premium'])
param redisSkuName string = 'Basic'

@description('Redis family (C for Basic/Standard, P for Premium)')
@allowed(['C', 'P'])
param redisFamily string = 'C'

@description('Redis capacity (0-6 for Basic/Standard, 0-5 for Premium)')
param redisCapacity int = 0

@description('PostgreSQL SKU tier')
@allowed(['Burstable', 'GeneralPurpose', 'MemoryOptimized'])
param postgresTier string = 'GeneralPurpose'

@description('PostgreSQL SKU name')
param postgresSkuName string = 'Standard_D2s_v3'

@description('PostgreSQL storage size in GB')
param postgresStorageSizeGB int = 128

@description('PostgreSQL version')
@allowed(['11', '12', '13', '14', '15', '16'])
param postgresVersion string = '15'

@description('VNet address prefix')
param vnetAddressPrefix string = '10.0.0.0/16'

@description('Container App subnet prefix')
param containerAppSubnetPrefix string = '10.0.0.0/21'

@description('PostgreSQL subnet prefix')
param postgresSubnetPrefix string = '10.0.8.0/24'

@description('Private endpoint subnet prefix')
param privateEndpointSubnetPrefix string = '10.0.9.0/24'

@description('Minimum replicas for Kong Container App')
param minReplicas int = 2

@description('Maximum replicas for Kong Container App')
param maxReplicas int = 5

@description('Kong CPU allocation')
param kongCpu string = '1'

@description('Kong memory allocation')
param kongMemory string = '2Gi'

@description('Log Analytics retention in days')
param logRetentionDays int = 30

@description('Enable high availability for PostgreSQL')
param enablePostgresHA bool = true

@description('Zitadel issuer URL')
param zitadelIssuer string = 'https://auth.kombify.io'

@description('Zitadel JWKS URL')
param zitadelJwksUrl string = 'https://auth.kombify.io/oauth/v2/keys'

@description('Enable private endpoints for PostgreSQL')
param enablePrivateEndpoint bool = true

@description('Custom domain for API')
param customDomain string = 'api.kombify.io'

@description('Tags to apply to all resources')
param tags object = {
  Environment: environment
  Project: 'kombify'
  ManagedBy: 'bicep'
  CostCenter: 'platform'
}

// -----------------------------------------------------------------------------
// Variables
// -----------------------------------------------------------------------------

var prefix = 'kombify-${environment}'
var resourceNames = {
  postgres: 'psql-${prefix}'
  redis: 'redis-${prefix}'
  keyVault: 'kv-${prefix}'
  managedIdentity: 'id-kong-${prefix}'
  containerAppEnv: 'cae-${prefix}'
  logAnalytics: 'log-${prefix}'
  applicationInsights: 'appi-${prefix}'
  vnet: 'vnet-${prefix}'
  nsg: 'nsg-${prefix}'
  postgresSubnet: 'postgres-subnet'
  containerAppSubnet: 'ca-subnet'
  privateEndpointSubnet: 'pe-subnet'
}

// -----------------------------------------------------------------------------
// Virtual Network and Subnets
// -----------------------------------------------------------------------------

resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: resourceNames.vnet
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        vnetAddressPrefix
      ]
    }
    subnets: [
      {
        name: resourceNames.containerAppSubnet
        properties: {
          addressPrefix: containerAppSubnetPrefix
          delegations: [
            {
              name: 'Microsoft.App.environments'
              properties: {
                serviceName: 'Microsoft.App/environments'
              }
            }
          ]
        }
      }
      {
        name: resourceNames.postgresSubnet
        properties: {
          addressPrefix: postgresSubnetPrefix
          delegations: [
            {
              name: 'Microsoft.DBforPostgreSQL.flexibleServers'
              properties: {
                serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers'
              }
            }
          ]
          serviceEndpoints: [
            {
              service: 'Microsoft.Storage'
            }
          ]
        }
      }
      {
        name: resourceNames.privateEndpointSubnet
        properties: {
          addressPrefix: privateEndpointSubnetPrefix
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

// -----------------------------------------------------------------------------
// Network Security Group
// -----------------------------------------------------------------------------

resource nsg 'Microsoft.Network/networkSecurityGroups@2023-09-01' = {
  name: resourceNames.nsg
  location: location
  tags: tags
  properties: {
    securityRules: [
      {
        name: 'AllowKongProxy'
        properties: {
          priority: 100
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: 'Internet'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '8000'
        }
      }
      {
        name: 'AllowKongAdminInternal'
        properties: {
          priority: 110
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: vnetAddressPrefix
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '8001'
        }
      }
      {
        name: 'DenyKongAdminExternal'
        properties: {
          priority: 120
          direction: 'Inbound'
          access: 'Deny'
          protocol: '*'
          sourceAddressPrefix: 'Internet'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '8001'
        }
      }
      {
        name: 'AllowPostgreSQLInternal'
        properties: {
          priority: 130
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: vnetAddressPrefix
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '5432'
        }
      }
    ]
  }
}

// -----------------------------------------------------------------------------
// Managed Identity for Kong
// -----------------------------------------------------------------------------

resource kongIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: resourceNames.managedIdentity
  location: location
  tags: tags
}

// -----------------------------------------------------------------------------
// Key Vault
// -----------------------------------------------------------------------------

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: resourceNames.keyVault
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: false
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      ipRules: []
      virtualNetworkRules: [
        {
          id: vnet.properties.subnets[0].id
          ignoreMissingVnetServiceEndpoint: false
        }
      ]
    }
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: kongIdentity.properties.principalId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

// -----------------------------------------------------------------------------
// Key Vault Secrets
// -----------------------------------------------------------------------------

resource secretPostgresHost 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'kong-pg-host'
  properties: {
    value: '${resourceNames.postgres}.postgres.database.azure.com'
  }
}

resource secretPostgresUser 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'kong-pg-user'
  properties: {
    value: postgresAdminUser
  }
}

resource secretPostgresPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'kong-pg-password'
  properties: {
    value: postgresAdminPassword
  }
}

resource secretPostgresDatabase 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'kong-pg-database'
  properties: {
    value: 'kong'
  }
}

resource secretKongAdminToken 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'kong-admin-token'
  properties: {
    value: uniqueString(resourceGroup().id, subscription().subscriptionId, 'kong-admin-token')
  }
}

// -----------------------------------------------------------------------------
// Log Analytics Workspace
// -----------------------------------------------------------------------------

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: resourceNames.logAnalytics
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: logRetentionDays
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// -----------------------------------------------------------------------------
// Application Insights
// -----------------------------------------------------------------------------

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: resourceNames.applicationInsights
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    Flow_Type: 'Bluefield'
    Request_Source: 'rest'
  }
}

// -----------------------------------------------------------------------------
// Redis Cache for Rate Limiting
// -----------------------------------------------------------------------------

resource redisCache 'Microsoft.Cache/redis@2023-08-01' = {
  name: resourceNames.redis
  location: location
  tags: tags
  properties: {
    sku: {
      name: redisSkuName
      family: redisFamily
      capacity: redisCapacity
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'
    redisConfiguration: {
      maxmemory-policy: 'allkeys-lru'
    }
  }
}

resource redisPrivateEndpoint 'Microsoft.Network/privateEndpoints@2023-09-01' = if (enablePrivateEndpoint) {
  name: '${resourceNames.redis}-pe'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: vnet.properties.subnets[2].id
    }
    privateLinkServiceConnections: [
      {
        name: '${resourceNames.redis}-plsc'
        properties: {
          privateLinkServiceId: redisCache.id
          groupIds: [
            'redisCache'
          ]
        }
      }
    ]
  }
}

resource redisPrivateDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = if (enablePrivateEndpoint) {
  name: 'privatelink.redis.cache.windows.net'
  location: 'global'
  tags: tags
}

resource redisPrivateDnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = if (enablePrivateEndpoint) {
  name: '${redisPrivateDnsZone.name}-link'
  parent: redisPrivateDnsZone
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnet.id
    }
  }
}

resource redisPrivateDnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-09-01' = if (enablePrivateEndpoint) {
  name: 'default'
  parent: redisPrivateEndpoint
  properties: {
    privateDnsZoneConfigs: [
      {
        name: redisPrivateDnsZone.name
        properties: {
          privateDnsZoneId: redisPrivateDnsZone.id
        }
      }
    ]
  }
}

resource secretRedisPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'redis-password'
  properties: {
    value: redisCache.listKeys().primaryKey
  }
}

resource secretRedisHost 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'redis-host'
  properties: {
    value: redisCache.properties.hostName
  }
}

// -----------------------------------------------------------------------------
// PostgreSQL Flexible Server
// -----------------------------------------------------------------------------

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: resourceNames.postgres
  location: location
  tags: tags
  sku: {
    name: postgresSkuName
    tier: postgresTier
  }
  properties: {
    version: postgresVersion
    administratorLogin: postgresAdminUser
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: postgresStorageSizeGB
      autoGrow: 'Enabled'
    }
    highAvailability: enablePostgresHA ? {
      mode: 'ZoneRedundant'
      standbyAvailabilityZone: '2'
    } : null
    network: {
      delegatedSubnetResourceId: vnet.properties.subnets[1].id
      privateDnsZoneArmResourceId: postgresPrivateDnsZone.id
      publicNetworkAccess: 'Disabled'
    }
    backup: {
      backupRetentionDays: 35
      geoRedundantBackup: 'Enabled'
    }
    maintenanceWindow: {
      customWindow: 'Enabled'
      dayOfWeek: 0
      startHour: 3
      startMinute: 0
    }
  }
  dependsOn: [
    vnet
    postgresPrivateDnsZoneLink
  ]
}

resource postgresPrivateDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: '${resourceNames.postgres}.private.postgres.database.azure.com'
  location: 'global'
  tags: tags
}

resource postgresPrivateDnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  name: '${postgresPrivateDnsZone.name}-link'
  parent: postgresPrivateDnsZone
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnet.id
    }
  }
}

resource kongDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgresServer
  name: 'kong'
  properties: {}
}

// -----------------------------------------------------------------------------
// Container App Environment
// -----------------------------------------------------------------------------

resource containerAppEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: resourceNames.containerAppEnv
  location: location
  tags: tags
  properties: {
    vnetConfiguration: {
      infrastructureSubnetId: vnet.properties.subnets[0].id
      internal: false
    }
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
    zoneRedundant: true
  }
}

// -----------------------------------------------------------------------------
// Kong Container App Module
// -----------------------------------------------------------------------------

module kongAppModule 'kong-app.bicep' = {
  name: 'kongAppDeployment'
  params: {
    name: 'ca-kong-${prefix}'
    location: location
    tags: tags
    environment: environment
    containerAppEnvironmentId: containerAppEnv.id
    managedIdentityId: kongIdentity.id
    managedIdentityClientId: kongIdentity.properties.clientId
    keyVaultName: keyVault.name
    kongImage: kongImage
    minReplicas: minReplicas
    maxReplicas: maxReplicas
    cpu: kongCpu
    memory: kongMemory
    redisHost: redisCache.properties.hostName
    zitadelIssuer: zitadelIssuer
    zitadelJwksUrl: zitadelJwksUrl
    postgresHost: '${resourceNames.postgres}.postgres.database.azure.com'
    postgresUser: postgresAdminUser
    appInsightsConnectionString: appInsights.properties.ConnectionString
  }
  dependsOn: [
    kongDatabase
    secretPostgresPassword
    secretRedisPassword
  ]
}

// -----------------------------------------------------------------------------
// Front Door Module
// -----------------------------------------------------------------------------

module frontDoorModule 'frontdoor.bicep' = {
  name: 'frontDoorDeployment'
  params: {
    name: 'afd-${prefix}'
    location: 'Global'
    tags: tags
    environment: environment
    customDomain: customDomain
    originHostName: kongAppModule.outputs.fqdn
    healthProbePath: '/health'
  }
}

// -----------------------------------------------------------------------------
// Monitoring Module
// -----------------------------------------------------------------------------

module monitoringModule 'monitoring.bicep' = {
  name: 'monitoringDeployment'
  params: {
    location: location
    tags: tags
    environment: environment
    logAnalyticsWorkspaceId: logAnalytics.id
    logAnalyticsWorkspaceName: logAnalytics.name
    containerAppName: kongAppModule.outputs.containerAppName
    keyVaultName: keyVault.name
    redisName: redisCache.name
    postgresName: postgresServer.name
    alertActionGroupEmail: 'platform-alerts@kombify.io'
  }
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------

@description('Kong Container App FQDN')
output kongFqdn string = kongAppModule.outputs.fqdn

@description('Kong Container App URL')
output kongUrl string = 'https://${kongAppModule.outputs.fqdn}'

@description('PostgreSQL server FQDN')
output postgresHost string = postgresServer.properties.fullyQualifiedDomainName

@description('Redis cache hostname')
output redisHost string = redisCache.properties.hostName

@description('Key Vault URI')
output keyVaultUri string = keyVault.properties.vaultUri

@description('Key Vault name')
output keyVaultName string = keyVault.name

@description('Application Insights name')
output appInsightsName string = appInsights.name

@description('Log Analytics workspace ID')
output logAnalyticsWorkspaceId string = logAnalytics.id

@description('Managed Identity principal ID')
output managedIdentityPrincipalId string = kongIdentity.properties.principalId

@description('Managed Identity client ID')
output managedIdentityClientId string = kongIdentity.properties.clientId

@description('Front Door endpoint hostname')
output frontDoorHostname string = frontDoorModule.outputs.frontDoorEndpointHostName

@description('Front Door ID')
output frontDoorId string = frontDoorModule.outputs.frontDoorId

@description('VNet ID')
output vnetId string = vnet.id
