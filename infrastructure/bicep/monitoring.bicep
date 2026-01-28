// =============================================================================
// Monitoring and Alerts Module
// =============================================================================
// This module deploys monitoring infrastructure including:
// - Log Analytics workspace
// - Application Insights (created in main.bicep)
// - Alert rules for:
//   - High error rate (>5%)
//   - Response time > 2s
//   - Failed health checks
//   - Container App restarts
// =============================================================================

// -----------------------------------------------------------------------------
// Parameters
// -----------------------------------------------------------------------------

@description('Azure region')
param location string = resourceGroup().location

@description('Resource tags')
param tags object = {}

@description('Environment name')
param environment string

@description('Log Analytics Workspace ID')
param logAnalyticsWorkspaceId string

@description('Log Analytics Workspace name')
param logAnalyticsWorkspaceName string

@description('Kong Container App name')
param containerAppName string

@description('Key Vault name')
param keyVaultName string

@description('Redis Cache name')
param redisName string

@description('PostgreSQL server name')
param postgresName string

@description('Alert action group email')
param alertActionGroupEmail string = 'platform-alerts@kombify.io'

@description('High error rate threshold (percentage)')
param errorRateThreshold int = 5

@description('Response time threshold in milliseconds')
param responseTimeThreshold int = 2000

@description('Failed health check threshold')
param healthCheckFailureThreshold int = 3

@description('Container restart threshold')
param containerRestartThreshold int = 5

@description('CPU utilization threshold (percentage)')
param cpuThreshold int = 80

@description('Memory utilization threshold (percentage)')
param memoryThreshold int = 85

@description('Alert evaluation frequency')
@allowed(['PT1M', 'PT5M', 'PT15M', 'PT30M', 'PT1H'])
param evaluationFrequency string = 'PT5M'

@description('Alert window size')
@allowed(['PT5M', 'PT15M', 'PT30M', 'PT1H', 'PT6H', 'PT12H', 'P1D'])
param windowSize string = 'PT15M'

@description('Severity for critical alerts')
@allowed([0, 1, 2, 3, 4])
param criticalAlertSeverity int = 0

@description('Severity for warning alerts')
@allowed([0, 1, 2, 3, 4])
param warningAlertSeverity int = 2

// -----------------------------------------------------------------------------
// Existing Resources
// -----------------------------------------------------------------------------

resource containerApp 'Microsoft.App/containerApps@2024-03-01' existing = {
  name: containerAppName
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource redis 'Microsoft.Cache/redis@2023-08-01' existing = {
  name: redisName
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' existing = {
  name: postgresName
}

// -----------------------------------------------------------------------------
// Action Group
// -----------------------------------------------------------------------------

resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: 'ag-kombify-${environment}'
  location: 'Global'
  tags: tags
  properties: {
    groupShortName: 'KombifyAlerts'
    enabled: true
    emailReceivers: [
      {
        name: 'PlatformTeam'
        emailAddress: alertActionGroupEmail
        useCommonAlertSchema: true
      }
    ]
    smsReceivers: []
    webhookReceivers: []
    azureAppPushReceivers: []
    voiceReceivers: []
  }
}

// -----------------------------------------------------------------------------
// Log Alert Rules
// -----------------------------------------------------------------------------

// High Error Rate Alert
resource highErrorRateAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: 'alert-kong-high-error-rate-${environment}'
  location: location
  tags: tags
  properties: {
    displayName: 'Kong High Error Rate'
    description: 'Alert when Kong error rate exceeds ${errorRateThreshold}%'
    severity: criticalAlertSeverity
    enabled: true
    evaluationFrequency: evaluationFrequency
    scopes: [
      logAnalyticsWorkspaceId
    ]
    windowSize: windowSize
    criteria: {
      allOf: [
        {
          query: '''
            ContainerAppConsoleLogs_CL
            | where ContainerAppName_s == '${containerAppName}'
            | where Log_s contains "error" or Log_s contains "ERROR"
            | summarize ErrorCount = count()
            | extend TotalCount = toscalar(
                ContainerAppConsoleLogs_CL
                | where ContainerAppName_s == '${containerAppName}'
                | count
              )
            | extend ErrorRate = (ErrorCount * 100.0) / TotalCount
            | where ErrorRate > ${errorRateThreshold}
          '''
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 2
            minFailingPeriodsToAlert: 2
          }
        }
      ]
    }
    actions: {
      actionGroups: [
        actionGroup.id
      ]
    }
  }
}

// High Response Time Alert
resource highResponseTimeAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: 'alert-kong-high-response-time-${environment}'
  location: location
  tags: tags
  properties: {
    displayName: 'Kong High Response Time'
    description: 'Alert when Kong response time exceeds ${responseTimeThreshold}ms'
    severity: warningAlertSeverity
    enabled: true
    evaluationFrequency: evaluationFrequency
    scopes: [
      logAnalyticsWorkspaceId
    ]
    windowSize: windowSize
    criteria: {
      allOf: [
        {
          query: '''
            ContainerAppConsoleLogs_CL
            | where ContainerAppName_s == '${containerAppName}'
            | where Log_s contains "latency" or Log_s contains "duration"
            | extend ResponseTime = extract(@"(\d+)ms", 1, Log_s)
            | where isnotempty(ResponseTime)
            | extend ResponseTimeInt = toint(ResponseTime)
            | where ResponseTimeInt > ${responseTimeThreshold}
            | summarize AvgResponseTime = avg(ResponseTimeInt)
          '''
          timeAggregation: 'Average'
          operator: 'GreaterThan'
          threshold: responseTimeThreshold
          failingPeriods: {
            numberOfEvaluationPeriods: 3
            minFailingPeriodsToAlert: 2
          }
        }
      ]
    }
    actions: {
      actionGroups: [
        actionGroup.id
      ]
    }
  }
}

// Failed Health Checks Alert
resource failedHealthChecksAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: 'alert-kong-failed-health-checks-${environment}'
  location: location
  tags: tags
  properties: {
    displayName: 'Kong Failed Health Checks'
    description: 'Alert when Kong health checks fail consecutively'
    severity: criticalAlertSeverity
    enabled: true
    evaluationFrequency: evaluationFrequency
    scopes: [
      logAnalyticsWorkspaceId
    ]
    windowSize: windowSize
    criteria: {
      allOf: [
        {
          query: '''
            ContainerAppConsoleLogs_CL
            | where ContainerAppName_s == '${containerAppName}'
            | where Log_s contains "health" and (Log_s contains "fail" or Log_s contains "unhealthy")
            | summarize FailureCount = count()
            | where FailureCount >= ${healthCheckFailureThreshold}
          '''
          timeAggregation: 'Count'
          operator: 'GreaterThanOrEqual'
          threshold: healthCheckFailureThreshold
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: [
        actionGroup.id
      ]
    }
  }
}

// Container App Restarts Alert
resource containerRestartsAlert 'Microsoft.Insights/scheduledQueryRules@2023-03-15-preview' = {
  name: 'alert-kong-container-restarts-${environment}'
  location: location
  tags: tags
  properties: {
    displayName: 'Kong Container Restarts'
    description: 'Alert when Kong container restarts exceed threshold'
    severity: warningAlertSeverity
    enabled: true
    evaluationFrequency: evaluationFrequency
    scopes: [
      logAnalyticsWorkspaceId
    ]
    windowSize: windowSize
    criteria: {
      allOf: [
        {
          query: '''
            ContainerAppSystemLogs_CL
            | where ContainerAppName_s == '${containerAppName}'
            | where Log_s contains "restart" or Log_s contains "Restarting"
            | summarize RestartCount = count()
            | where RestartCount >= ${containerRestartThreshold}
          '''
          timeAggregation: 'Count'
          operator: 'GreaterThanOrEqual'
          threshold: containerRestartThreshold
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: [
        actionGroup.id
      ]
    }
  }
}

// -----------------------------------------------------------------------------
// Metric Alert Rules
// -----------------------------------------------------------------------------

// CPU Utilization Alert
resource cpuAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alert-kong-cpu-${environment}'
  location: 'Global'
  tags: tags
  properties: {
    description: 'Alert when Kong CPU utilization exceeds ${cpuThreshold}%'
    severity: warningAlertSeverity
    enabled: true
    scopes: [
      containerApp.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'CPU Criteria'
          metricName: 'UsageNanoCores'
          metricNamespace: 'Microsoft.App/containerApps'
          operator: 'GreaterThan'
          threshold: cpuThreshold
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Memory Utilization Alert
resource memoryAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alert-kong-memory-${environment}'
  location: 'Global'
  tags: tags
  properties: {
    description: 'Alert when Kong memory utilization exceeds ${memoryThreshold}%'
    severity: warningAlertSeverity
    enabled: true
    scopes: [
      containerApp.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Memory Criteria'
          metricName: 'UsageBytes'
          metricNamespace: 'Microsoft.App/containerApps'
          operator: 'GreaterThan'
          threshold: memoryThreshold * 1000000  // Convert to bytes approximation
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Redis Connection Errors Alert
resource redisAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alert-redis-errors-${environment}'
  location: 'Global'
  tags: tags
  properties: {
    description: 'Alert when Redis encounters errors'
    severity: criticalAlertSeverity
    enabled: true
    scopes: [
      redis.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Errors Criteria'
          metricName: 'errors'
          metricNamespace: 'Microsoft.Cache/redis'
          operator: 'GreaterThan'
          threshold: 10
          timeAggregation: 'Total'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// PostgreSQL CPU Alert
resource postgresCpuAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alert-postgres-cpu-${environment}'
  location: 'Global'
  tags: tags
  properties: {
    description: 'Alert when PostgreSQL CPU exceeds 80%'
    severity: warningAlertSeverity
    enabled: true
    scopes: [
      postgres.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'CPU Criteria'
          metricName: 'cpu_percent'
          metricNamespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
          operator: 'GreaterThan'
          threshold: 80
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// PostgreSQL Storage Alert
resource postgresStorageAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alert-postgres-storage-${environment}'
  location: 'Global'
  tags: tags
  properties: {
    description: 'Alert when PostgreSQL storage exceeds 85%'
    severity: criticalAlertSeverity
    enabled: true
    scopes: [
      postgres.id
    ]
    evaluationFrequency: 'PT15M'
    windowSize: 'PT1H'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Storage Criteria'
          metricName: 'storage_percent'
          metricNamespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
          operator: 'GreaterThan'
          threshold: 85
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Key Vault Availability Alert
resource keyVaultAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alert-keyvault-availability-${environment}'
  location: 'Global'
  tags: tags
  properties: {
    description: 'Alert when Key Vault availability drops'
    severity: criticalAlertSeverity
    enabled: true
    scopes: [
      keyVault.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Availability Criteria'
          metricName: 'Availability'
          metricNamespace: 'Microsoft.KeyVault/vaults'
          operator: 'LessThan'
          threshold: 99
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// -----------------------------------------------------------------------------
// Diagnostic Settings
// -----------------------------------------------------------------------------

resource containerAppDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'diag-${containerAppName}'
  scope: containerApp
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        category: 'ContainerAppConsoleLogs'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 30
        }
      }
      {
        category: 'ContainerAppSystemLogs'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 30
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 30
        }
      }
    ]
  }
}

// -----------------------------------------------------------------------------
// Workbook for Dashboard
// -----------------------------------------------------------------------------

resource kongDashboard 'Microsoft.Insights/workbooks@2023-06-01' = {
  name: guid(resourceGroup().id, 'kong-dashboard')
  location: location
  tags: tags
  kind: 'shared'
  properties: {
    displayName: 'Kong Gateway Dashboard - ${environment}'
    description: 'Monitoring dashboard for Kong Gateway'
    category: 'workbook'
    serializedData: string({
      version: 'Notebook/1.0'
      items: [
        {
          type: 1
          content: {
            json: '# Kong Gateway Monitoring Dashboard'
          }
        }
        {
          type: 3
          content: {
            version: 'KqlItem/1.0'
            query: '''
              ContainerAppConsoleLogs_CL
              | where ContainerAppName_s == '${containerAppName}'
              | summarize Count = count() by bin(TimeGenerated, 5m)
              | render timechart
            '''
            size: 0
            title: 'Request Volume'
            timeContext: {
              durationMs: 3600000
            }
          }
        }
        {
          type: 3
          content: {
            version: 'KqlItem/1.0'
            query: '''
              ContainerAppConsoleLogs_CL
              | where ContainerAppName_s == '${containerAppName}'
              | where Log_s contains "error" or Log_s contains "ERROR"
              | summarize Count = count() by bin(TimeGenerated, 5m)
              | render timechart
            '''
            size: 0
            title: 'Error Count'
            timeContext: {
              durationMs: 3600000
            }
          }
        }
      ]
    })
    sourceId: logAnalyticsWorkspaceId
  }
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------

@description('Action Group ID')
output actionGroupId string = actionGroup.id

@description('Action Group name')
output actionGroupName string = actionGroup.name

@description('High error rate alert ID')
output highErrorRateAlertId string = highErrorRateAlert.id

@description('High response time alert ID')
output highResponseTimeAlertId string = highResponseTimeAlert.id

@description('Failed health checks alert ID')
output failedHealthChecksAlertId string = failedHealthChecksAlert.id

@description('Container restarts alert ID')
output containerRestartsAlertId string = containerRestartsAlert.id

@description('Dashboard ID')
output dashboardId string = kongDashboard.id
