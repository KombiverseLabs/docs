// =============================================================================
// Azure Front Door Module
// =============================================================================
// This module deploys Azure Front Door with:
// - Premium SKU with WAF
// - Origin group pointing to Kong Container App
// - Health probe configuration
// - Routing rules with caching
// - WAF policy with managed rules
// - Custom domain support
// =============================================================================

// -----------------------------------------------------------------------------
// Parameters
// -----------------------------------------------------------------------------

@description('Name of the Front Door profile')
param name string

@description('Azure region (Front Door is global)')
param location string = 'Global'

@description('Resource tags')
param tags object = {}

@description('Environment name')
param environment string

@description('Custom domain for API (e.g., api.kombify.io)')
param customDomain string

@description('Origin hostname (Kong Container App FQDN)')
param originHostName string

@description('Health probe path')
param healthProbePath string = '/health'

@description('Health probe protocol')
@allowed(['Http', 'Https'])
param healthProbeProtocol string = 'Https'

@description('Health probe interval in seconds')
param healthProbeInterval int = 30

@description('Origin response timeout in seconds')
param originResponseTimeout int = 60

@description('Session affinity enabled')
param sessionAffinityEnabled bool = false

@description('Compression enabled')
param compressionEnabled bool = true

@description('Query string caching behavior')
@allowed(['IgnoreQueryString', 'IgnoreSpecifiedQueryStrings', 'IncludeSpecifiedQueryStrings', 'UseQueryString'])
param queryStringCachingBehavior string = 'UseQueryString'

@description('Forwarding protocol')
@allowed(['HttpOnly', 'HttpsOnly', 'MatchRequest'])
param forwardingProtocol string = 'HttpsOnly'

@description('HTTPS redirect enabled')
param httpsRedirectEnabled bool = true

@description('WAF policy mode')
@allowed(['Prevention', 'Detection'])
param wafMode string = 'Prevention'

@description('Managed rule sets to enable')
param managedRuleSets array = [
  {
    ruleSetType: 'Microsoft_DefaultRuleSet'
    ruleSetVersion: '2.1'
    ruleSetAction: 'Block'
    exclusions: []
  }
  {
    ruleSetType: 'Microsoft_BotManagerRuleSet'
    ruleSetVersion: '1.0'
    ruleSetAction: 'Block'
    exclusions: []
  }
]

@description('Rate limit threshold (requests per minute)')
param rateLimitThreshold int = 1000

@description('Enable rate limiting')
param rateLimitEnabled bool = true

@description('IP allow list (optional)')
param ipAllowList array = []

@description('IP block list (optional)')
param ipBlockList array = []

// -----------------------------------------------------------------------------
// Variables
// -----------------------------------------------------------------------------

var endpointName = 'api-${environment}'
var originGroupName = 'kong-origin-group'
var originName = 'kong-origin'
var routeName = 'api-route'
var wafPolicyName = 'waf-${name}'

// -----------------------------------------------------------------------------
// WAF Policy
// -----------------------------------------------------------------------------

resource wafPolicy 'Microsoft.Network/frontDoorWebApplicationFirewallPolicies@2024-02-01' = {
  name: wafPolicyName
  location: location
  tags: tags
  sku: {
    name: 'Premium_AzureFrontDoor'
  }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: wafMode
      defaultRedirectUrl: null
      customBlockResponseStatusCode: 403
      customBlockResponseBody: base64('{"error": "Access Denied", "message": "Your request has been blocked by security rules."}')
      requestBodyCheck: 'Enabled'
      requestBodyInspectLimitInKB: 128
    }
    customRules: {
      rules: [
        // Rate limiting rule
        {
          name: 'RateLimitRule'
          priority: 1
          enabledState: rateLimitEnabled ? 'Enabled' : 'Disabled'
          ruleType: 'RateLimitRule'
          rateLimitDurationInMinutes: 1
          rateLimitThreshold: rateLimitThreshold
          matchConditions: [
            {
              matchVariable: 'RemoteAddr'
              selector: null
              operator: 'IPMatch'
              negateCondition: false
              matchValue: [
                '0.0.0.0/0'
              ]
              transforms: []
            }
          ]
          action: 'Block'
        }
        // IP Allow List Rule (if configured)
        {
          name: 'IPAllowListRule'
          priority: 2
          enabledState: empty(ipAllowList) ? 'Disabled' : 'Enabled'
          ruleType: 'MatchRule'
          matchConditions: [
            {
              matchVariable: 'RemoteAddr'
              selector: null
              operator: 'IPMatch'
              negateCondition: false
              matchValue: ipAllowList
              transforms: []
            }
          ]
          action: 'Allow'
        }
        // IP Block List Rule (if configured)
        {
          name: 'IPBlockListRule'
          priority: 3
          enabledState: empty(ipBlockList) ? 'Disabled' : 'Enabled'
          ruleType: 'MatchRule'
          matchConditions: [
            {
              matchVariable: 'RemoteAddr'
              selector: null
              operator: 'IPMatch'
              negateCondition: false
              matchValue: ipBlockList
              transforms: []
            }
          ]
          action: 'Block'
        }
        // Block common attack patterns
        {
          name: 'BlockSuspiciousUserAgents'
          priority: 4
          enabledState: 'Enabled'
          ruleType: 'MatchRule'
          matchConditions: [
            {
              matchVariable: 'RequestHeader'
              selector: 'User-Agent'
              operator: 'Contains'
              negateCondition: false
              matchValue: [
                'sqlmap'
                'nikto'
                'nmap'
                'masscan'
                'zgrab'
                'gobuster'
                'dirbuster'
              ]
              transforms: [
                'Lowercase'
              ]
            }
          ]
          action: 'Block'
        }
      ]
    }
    managedRules: {
      managedRuleSets: [for ruleSet in managedRuleSets: {
        ruleSetType: ruleSet.ruleSetType
        ruleSetVersion: ruleSet.ruleSetVersion
        ruleSetAction: ruleSet.ruleSetAction
        ruleGroupOverrides: []
        exclusions: ruleSet.exclusions
      }]
    }
  }
}

// -----------------------------------------------------------------------------
// Front Door Profile
// -----------------------------------------------------------------------------

resource frontDoorProfile 'Microsoft.Cdn/profiles@2024-02-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: 'Premium_AzureFrontDoor'
  }
  properties: {
    originResponseTimeoutSeconds: originResponseTimeout
  }
}

// -----------------------------------------------------------------------------
// Front Door Endpoint
// -----------------------------------------------------------------------------

resource frontDoorEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-02-01' = {
  parent: frontDoorProfile
  name: endpointName
  location: location
  properties: {
    enabledState: 'Enabled'
  }
}

// -----------------------------------------------------------------------------
// Custom Domain
// -----------------------------------------------------------------------------

resource customDomainResource 'Microsoft.Cdn/profiles/customDomains@2024-02-01' = {
  parent: frontDoorProfile
  name: replace(customDomain, '.', '-')
  properties: {
    hostName: customDomain
    tlsSettings: {
      certificateType: 'ManagedCertificate'
      minimumTlsVersion: 'TLS12'
      secret: null
    }
  }
}

// -----------------------------------------------------------------------------
// Origin Group
// -----------------------------------------------------------------------------

resource originGroup 'Microsoft.Cdn/profiles/originGroups@2024-02-01' = {
  parent: frontDoorProfile
  name: originGroupName
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: healthProbePath
      probeRequestType: 'GET'
      probeProtocol: healthProbeProtocol
      probeIntervalInSeconds: healthProbeInterval
    }
    sessionAffinityState: sessionAffinityEnabled ? 'Enabled' : 'Disabled'
  }
}

// -----------------------------------------------------------------------------
// Origin (Kong Container App)
// -----------------------------------------------------------------------------

resource origin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = {
  parent: originGroup
  name: originName
  properties: {
    hostName: originHostName
    httpPort: 80
    httpsPort: 443
    originHostHeader: originHostName
    priority: 1
    weight: 100
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

// -----------------------------------------------------------------------------
// Route with Caching and WAF
// -----------------------------------------------------------------------------

resource route 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-02-01' = {
  parent: frontDoorEndpoint
  name: routeName
  properties: {
    customDomains: [
      {
        id: customDomainResource.id
      }
    ]
    originGroup: {
      id: originGroup.id
    }
    ruleSets: []
    supportedProtocols: [
      'Http'
      'Https'
    ]
    patternsToMatch: [
      '/*'
    ]
    forwardingProtocol: forwardingProtocol
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: httpsRedirectEnabled ? 'Enabled' : 'Disabled'
    enabledState: 'Enabled'
    cacheConfiguration: {
      queryStringCachingBehavior: queryStringCachingBehavior
      compressionSettings: {
        isCompressionEnabled: compressionEnabled
        contentTypesToCompress: [
          'application/eot'
          'application/font'
          'application/font-sfnt'
          'application/javascript'
          'application/json'
          'application/opentype'
          'application/otf'
          'application/pkcs7-mime'
          'application/truetype'
          'application/ttf'
          'application/vnd.ms-fontobject'
          'application/xhtml+xml'
          'application/xml'
          'application/xml+rss'
          'application/x-font-opentype'
          'application/x-font-truetype'
          'application/x-font-ttf'
          'application/x-httpd-cgi'
          'application/x-javascript'
          'application/x-mpegurl'
          'application/x-opentype'
          'application/x-otf'
          'application/x-perl'
          'application/x-ttf'
          'font/eot'
          'font/ttf'
          'font/otf'
          'font/opentype'
          'image/svg+xml'
          'text/css'
          'text/csv'
          'text/html'
          'text/javascript'
          'text/js'
          'text/markdown'
          'text/plain'
          'text/richtext'
          'text/tab-separated-values'
          'text/xml'
          'text/x-script'
          'text/x-component'
          'text/x-java-source'
        ]
      }
    }
  }
  dependsOn: [
    origin
  ]
}

// -----------------------------------------------------------------------------
// Security Policy (WAF Association)
// -----------------------------------------------------------------------------

resource securityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2024-02-01' = {
  parent: frontDoorProfile
  name: 'waf-policy'
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: {
        id: wafPolicy.id
      }
      associations: [
        {
          domains: [
            {
              id: frontDoorEndpoint.id
            }
            {
              id: customDomainResource.id
            }
          ]
          patternsToMatch: [
            '/*'
          ]
        }
      ]
    }
  }
  dependsOn: [
    route
  ]
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------

@description('Front Door Profile ID')
output frontDoorId string = frontDoorProfile.id

@description('Front Door Profile name')
output frontDoorName string = frontDoorProfile.name

@description('Front Door Endpoint hostname')
output frontDoorEndpointHostName string = frontDoorEndpoint.properties.hostName

@description('Front Door Endpoint URL')
output frontDoorEndpointUrl string = 'https://${frontDoorEndpoint.properties.hostName}'

@description('Custom domain URL')
output customDomainUrl string = 'https://${customDomain}'

@description('WAF Policy ID')
output wafPolicyId string = wafPolicy.id

@description('WAF Policy name')
output wafPolicyName string = wafPolicy.name

@description('Origin Group ID')
output originGroupId string = originGroup.id

@description('Origin ID')
output originId string = origin.id

@description('Route ID')
output routeId string = route.id
