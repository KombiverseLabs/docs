# kombify StackKits - Technical Architecture

> **Version:** 2.0.0  
> **Last Updated:** 2026-01-23  
> **Repository:** StackKits  
> **License:** MIT

---

## Module Identity

| Attribute | Value |
|-----------|-------|
| **Product Name** | kombify StackKits |
| **Role** | Declarative Infrastructure Blueprints |
| **Primary Users** | Infrastructure architects, DevOps, Homelab users |
| **Tech Stack** | CUE, OpenTofu, Terramate, Go |

---

## Overview

**kombify StackKits** sind deklarative Infrastructure-Blueprints — validierte IaC-Templates mit CUE-Schemata für zuverlässige Homelab-Deployments.

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **CUE Validation** | Schema-basierte Konfigurationsvalidierung vor dem Deployment |
| **Homelab Blueprints** | Vordefinierte Templates für typische Use Cases |
| **Three-Layer Architecture** | OS → Platform → Application Trennung |
| **Dual-Mode Deployment** | Simple (OpenTofu) oder Advanced (Terramate) |
| **Add-On System** | Erweiterbare Module für zusätzliche Funktionalität |

---

## High-Level Data Flow

```
┌────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ User Input │───▶│   Unifier   │───▶│ CUE Validate │───▶│   OpenTofu  │
│kombination │    │    /CLI     │    │              │    │   Generate  │
│   .yaml    │    │             │    │              │    │             │
└────────────┘    └─────────────┘    └──────────────┘    └─────────────┘
                                                                │
                                                                ▼
                                                         ┌─────────────┐
                                                         │Infrastructure│
                                                         └─────────────┘
```

---

## Layered Architecture

StackKits verwendet eine modulare Drei-Schichten-Architektur für maximale Wiederverwendbarkeit.

### Layer 1: Core (Shared Schemas)

Located in `/base`, this layer defines the primitives:

```
/base
├── stackkit.cue    # Base StackKit definition
├── system.cue      # System-level schemas
├── network.cue     # Networking primitives
├── security.cue    # Security configuration
├── bootstrap/      # Shared Terraform templates
└── lifecycle/      # Lifecycle management
```

### Layer 2: StackKits (Blueprints)

Specific StackKit implementations extending Layer 1:

```
/base-homelab
├── stackfile.cue   # Main schema extension
├── services.cue    # Default service lineup
├── defaults.cue    # Opinionated defaults
└── variants/       # OS and compute variants
    ├── ubuntu.cue
    ├── debian.cue
    ├── compute-low.cue
    └── compute-high.cue
```

### Layer 3: Add-ons (Extensions)

Optional extensions that inject additional capabilities:

```
/addons
├── monitoring/     # Prometheus, Grafana
├── backup/         # Restic, Borg
├── ai/             # Ollama, Open WebUI
└── media/          # Jellyfin, Plex
```

---

## Available StackKits

### Base Homelab

| Attribute | Value |
|-----------|-------|
| **Target** | Single-server deployment |
| **OS** | Ubuntu (Debian variants) |
| **Includes** | Docker, monitoring, security hardening |

```cue
#BaseHomelab: {
    meta: {
        name: "base-homelab"
        version: "1.0.0"
    }
    requirements: {
        nodes: 1
        minCPU: 2
        minRAM: "4GB"
    }
    services: [
        "docker",
        "traefik",
        "uptime-kuma"
    ]
}
```

### Modern Homelab

| Attribute | Value |
|-----------|-------|
| **Target** | Hybrid setup (local + cloud) |
| **Nodes** | 2+ (local server + VPS) |
| **Includes** | Split services, VPN mesh |

```cue
#ModernHomelab: {
    meta: {
        name: "modern-homelab"
        version: "1.0.0"
    }
    requirements: {
        nodes: 2
        locations: ["local", "cloud"]
    }
    services: {
        local: ["storage", "compute", "smarthome"]
        cloud: ["proxy", "public-apps"]
    }
}
```

### HA Homelab

| Attribute | Value |
|-----------|-------|
| **Target** | High-availability cluster |
| **Nodes** | 3+ (Docker Swarm) |
| **Includes** | Clustering, replicated storage |

```cue
#HAHomelab: {
    meta: {
        name: "ha-homelab"
        version: "1.0.0"
    }
    requirements: {
        nodes: 3
        orchestration: "docker-swarm"
    }
    ha: {
        managerQuorum: 3
        replicatedServices: true
    }
}
```

---

## Execution Model

### Dual-Mode IaC

| Mode | Tool | Use Case |
|------|------|----------|
| **Simple (Day 1)** | OpenTofu | Single-stack, single-server setups |
| **Advanced (Day 2)** | Terramate | Multi-stack, drift detection, parallel execution |

### Simple Mode Lifecycle

```bash
tofu init   → tofu plan   → tofu apply
```

### Advanced Mode Lifecycle

```bash
terramate run -- tofu init
terramate run -- tofu plan
terramate run -- tofu apply
# Plus: change detection, drift detection, parallelism
```

---

## CLI Tool

### Core Commands

```bash
# Initialize workspace
stackkit init

# Validate configuration
stackkit validate

# Generate OpenTofu plans
stackkit plan

# Apply infrastructure changes
stackkit apply

# Detect drift
stackkit drift

# List available StackKits
stackkit list

# Update StackKits
stackkit update
```

### Usage Examples

```bash
# Initialize with base-homelab StackKit
stackkit init --stackkit=base-homelab

# Validate before deployment
stackkit validate ./kombination.yaml

# Plan changes
stackkit plan --output=plan.json

# Apply with dry-run
stackkit apply --dry-run

# Check for drift
stackkit drift --detailed
```

---

## Directory Structure

```
StackKits/
├── base/                   # Layer 1: Shared Core
│   ├── doc.cue
│   ├── stackkit.cue
│   ├── system.cue
│   ├── network.cue
│   └── security.cue
│
├── base-homelab/           # Layer 2: Base StackKit
│   ├── stackfile.cue
│   ├── services.cue
│   └── variants/
│
├── modern-homelab/         # Layer 2: Modern StackKit
├── ha-homelab/             # Layer 2: HA StackKit
│
├── addons/                 # Layer 3: Extensions
│
├── cmd/                    # CLI Source Code (Go)
│   └── stackkit/
│       └── main.go
│
├── internal/               # Internal Logic
│   ├── cue/                # Schema validation
│   ├── tofu/               # IaC generator
│   └── terramate/          # Advanced orchestration
│
├── platforms/              # Platform-specific configs
│   ├── docker/
│   └── kubernetes/         # (planned)
│
└── tests/                  # Validation tests
```

---

## CUE Schema Reference

### Base Service Definition

```cue
#Service: {
    name:        string
    image:       string
    ports?:      [...#Port]
    environment?: {...}
    volumes?:    [...#Volume]
    depends_on?: [...string]
    labels?:     {...}
    
    // Constraints
    name: =~"^[a-z][a-z0-9-]*$"
}

#Port: {
    host:      int & >=1 & <=65535
    container: int & >=1 & <=65535
    protocol:  *"tcp" | "udp"
}

#Volume: {
    source: string
    target: string
    type:   *"bind" | "volume" | "tmpfs"
}
```

### StackKit Definition

```cue
#StackKit: {
    meta: {
        name:        string
        version:     string
        description: string
        author?:     string
        license:     *"MIT" | "Apache-2.0" | "AGPL-3.0"
    }
    
    requirements: {
        nodes:    int & >=1
        minCPU:   int & >=1
        minRAM:   string
        storage?: string
    }
    
    layers: {
        os:       #OSConfig
        platform: #PlatformConfig
        services: [...#Service]
    }
    
    addons?: [...#Addon]
}
```

---

## PaaS Selection Rule

StackKits verwendet eine einfache Standardregel für die Deployment-Plattform:

| Scenario | Default PaaS | Reason |
|----------|--------------|--------|
| No domain (LAN-only) | Dokploy | Minimal DNS/SSL assumptions |
| Own domain available | Coolify | Better multi-node story |

Diese Regel ist ein **Default**, kein Lock-in — kann via Spec/Variant überschrieben werden.

---

## Integration with kombify Stack

StackKits werden von kombify Stack über den Unifier konsumiert:

```yaml
# kombination.yaml
stackkit: base-homelab
version: "1.0.0"

intent:
  name: "My Homelab"
  purpose: "photo-cloud"
  
nodes:
  - name: server-1
    type: local
    resources:
      cpu: 4
      ram: 16GB
```

Der Unifier:
1. Lädt das StackKit aus dem Registry
2. Validiert die Konfiguration gegen CUE-Schemata
3. Generiert OpenTofu-Konfigurationen
4. Übergibt an den Runner für Execution

---

## Self-Hosting Guide

### Using with kombify Stack

```bash
# StackKits are bundled with kombify Stack
docker run -v ./stackkits:/app/stackkits ghcr.io/soulcreek/kombistack:latest
```

### Standalone CLI

```bash
# Download StackKits CLI
curl -LO https://github.com/soulcreek/StackKits/releases/latest/download/stackkit_linux_amd64.tar.gz

# Extract
tar -xzf stackkit_linux_amd64.tar.gz

# Initialize project
./stackkit init --stackkit=base-homelab
```

### Custom StackKits

```bash
# Clone repository for customization
git clone https://github.com/soulcreek/StackKits.git

# Create custom StackKit
cp -r base-homelab my-homelab
cd my-homelab

# Edit schemas
vim stackfile.cue

# Validate
cue vet ./...
```

---

## Development

### Quick Start

```bash
# Clone repository
git clone https://github.com/soulcreek/StackKits.git
cd StackKits

# Run CUE validation
cue vet ./...

# Run tests
make test

# Build CLI
make build
```

### Useful Commands

```bash
cue fmt ./...     # Format CUE files
cue vet ./...     # Validate schemas
make lint         # Run linters
make test-e2e     # End-to-end tests
```

---

## Tool Category Reference

### Supported Tool Categories

```yaml
categories:
  - id: network
    name: Network & Routing
    tools:
      - traefik
      - caddy
      - nginx
      
  - id: storage
    name: Storage & Backup
    tools:
      - restic
      - borg
      - syncthing
      
  - id: auth
    name: Authentication
    tools:
      - authentik
      - authelia
      - tinyauth
      
  - id: orchestration
    name: Container Orchestration
    tools:
      - coolify
      - dokploy
      - portainer
      
  - id: monitoring
    name: Monitoring
    tools:
      - prometheus
      - grafana
      - uptime-kuma
      
  - id: media
    name: Media & Entertainment
    tools:
      - jellyfin
      - plex
      - immich
      
  - id: ai
    name: AI & Machine Learning
    tools:
      - ollama
      - open-webui
      - localai
```

---

## Related Documentation

- [kombify Stack](../stack/ARCHITECTURE.md) - Control Plane
- [kombify Sim](../sim/ARCHITECTURE.md) - Simulation Engine
- [Inter-Module Contracts](../../INTER_MODULE_CONTRACTS.md) - API Contracts

---

*Last reviewed: 2026-01-23*
