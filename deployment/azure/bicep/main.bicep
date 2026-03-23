// ============================================================
// RetailERP — Azure Bicep Main Template
// Deploy: az deployment group create --resource-group rg-retailerp-prod --template-file main.bicep --parameters @parameters.prod.json
// ============================================================

@description('Environment name: dev, qa, uat, prod')
@allowed(['dev', 'qa', 'uat', 'prod'])
param environment string

@description('Azure region')
param location string = resourceGroup().location

@description('AKS node VM size')
param aksNodeSize string = 'Standard_D4s_v3'

@description('AKS node count')
param aksNodeCount int = 3

@description('Azure SQL Server admin password')
@secure()
param sqlAdminPassword string

@description('Container image tag to deploy')
param imageTag string = 'latest'

var prefix = 'retailerp-${environment}'
var tags = {
  Project: 'RetailERP'
  Environment: environment
  ManagedBy: 'Bicep'
}

// ── Log Analytics Workspace ───────────────────────────────────
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${prefix}-logs'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: environment == 'prod' ? 90 : 30
  }
}

// ── Application Insights (per service) ───────────────────────
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-insights'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    RetentionInDays: environment == 'prod' ? 90 : 30
  }
}

// ── Virtual Network ───────────────────────────────────────────
resource vnet 'Microsoft.Network/virtualNetworks@2023-04-01' = {
  name: '${prefix}-vnet'
  location: location
  tags: tags
  properties: {
    addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
    subnets: [
      {
        name: 'aks-subnet'
        properties: {
          addressPrefix: '10.0.1.0/22'
          delegations: []
        }
      }
      {
        name: 'agw-subnet'
        properties: { addressPrefix: '10.0.10.0/24' }
      }
      {
        name: 'sql-subnet'
        properties: {
          addressPrefix: '10.0.20.0/24'
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

// ── Azure Container Registry ──────────────────────────────────
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: replace('${prefix}acr', '-', '')
  location: location
  tags: tags
  sku: { name: environment == 'prod' ? 'Premium' : 'Standard' }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

// ── Key Vault ─────────────────────────────────────────────────
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${prefix}-kv'
  location: location
  tags: tags
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: environment == 'prod' ? 90 : 7
    enablePurgeProtection: environment == 'prod'
    networkAcls: { defaultAction: 'Allow', bypass: 'AzureServices' }
  }
}

// Key Vault secrets
resource kvSecretSql 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'sql-connection-string'
  properties: {
    value: 'Server=${sqlServer.properties.fullyQualifiedDomainName};Database=RetailERP;User Id=retailerp_admin;Password=${sqlAdminPassword};TrustServerCertificate=true'
  }
}

// ── Azure SQL Server ──────────────────────────────────────────
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: '${prefix}-sql'
  location: location
  tags: tags
  properties: {
    administratorLogin: 'retailerp_admin'
    administratorLoginPassword: sqlAdminPassword
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-05-01-preview' = {
  parent: sqlServer
  name: 'RetailERP'
  location: location
  tags: tags
  sku: {
    name: environment == 'prod' ? 'BusinessCritical' : 'GeneralPurpose'
    tier: environment == 'prod' ? 'BusinessCritical' : 'GeneralPurpose'
    capacity: environment == 'prod' ? 4 : 2
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: environment == 'prod' ? 107374182400 : 34359738368 // 100GB or 32GB
    zoneRedundant: environment == 'prod'
    backupStorageRedundancy: environment == 'prod' ? 'Geo' : 'Local'
  }
}

resource sqlFirewall 'Microsoft.Sql/servers/firewallRules@2023-05-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ── Managed Identity for AKS ──────────────────────────────────
resource aksIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${prefix}-aks-identity'
  location: location
  tags: tags
}

// ── AKS Cluster ───────────────────────────────────────────────
resource aksCluster 'Microsoft.ContainerService/managedClusters@2023-10-01' = {
  name: '${prefix}-aks'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${aksIdentity.id}': {} }
  }
  properties: {
    dnsPrefix: '${prefix}-aks'
    kubernetesVersion: '1.29'
    networkProfile: {
      networkPlugin: 'azure'
      loadBalancerSku: 'standard'
      networkPolicy: 'calico'
      serviceCidr: '10.100.0.0/16'
      dnsServiceIP: '10.100.0.10'
    }
    agentPoolProfiles: [
      {
        name: 'system'
        mode: 'System'
        vmSize: 'Standard_D2s_v3'
        count: 1
        minCount: 1
        maxCount: 3
        enableAutoScaling: true
        osType: 'Linux'
        osSKU: 'Ubuntu'
        vnetSubnetID: vnet.properties.subnets[0].id
      }
      {
        name: 'user'
        mode: 'User'
        vmSize: aksNodeSize
        count: aksNodeCount
        minCount: environment == 'prod' ? 3 : 1
        maxCount: environment == 'prod' ? 10 : 5
        enableAutoScaling: true
        osType: 'Linux'
        vnetSubnetID: vnet.properties.subnets[0].id
      }
    ]
    addonProfiles: {
      omsagent: {
        enabled: true
        config: { logAnalyticsWorkspaceResourceID: logAnalytics.id }
      }
      azureKeyvaultSecretsProvider: {
        enabled: true
        config: { enableSecretRotation: 'true', rotationPollInterval: '2m' }
      }
      ingressApplicationGateway: {
        enabled: true
        config: { subnetID: vnet.properties.subnets[1].id }
      }
    }
    autoUpgradeProfile: { upgradeChannel: environment == 'prod' ? 'stable' : 'patch' }
    oidcIssuerProfile: { enabled: true }
    securityProfile: { workloadIdentity: { enabled: true } }
  }
}

// AcrPull role for AKS
resource acrPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, aksIdentity.id, 'AcrPull')
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: aksIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Key Vault Secrets User role for AKS
resource kvSecretsUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, aksIdentity.id, 'KeyVaultSecretsUser')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: aksIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// ── Outputs ───────────────────────────────────────────────────
output aksClusterName string = aksCluster.name
output acrLoginServer string = acr.properties.loginServer
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output keyVaultUri string = keyVault.properties.vaultUri
output appInsightsConnectionString string = appInsights.properties.ConnectionString
