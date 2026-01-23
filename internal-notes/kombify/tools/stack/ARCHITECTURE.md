# kombify Stack - Technical Architecture

> **Version:** 2.0.0  
> **Last Updated:** 2026-01-23  
> **Repository:** KombiStack  
> **License:** MIT + AGPL-3.0

---

## Module Identity

| Attribute | Value |
|-----------|-------|
| **Product Name** | kombify Stack |
| **Role** | Hybrid Infrastructure Control Plane |
| **Primary Users** | Homelab operators, DevOps engineers |
| **Tech Stack** | Go 1.24+, PocketBase, SvelteKit |

---

## Overview

**kombify Stack** ist das Herzstück des kombify-Ökosystems — die zentrale Orchestrierungs-Engine, die Cloud- und Home-Infrastruktur in einem einheitlichen Control Plane vereint.

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **Spec-Driven Deployment** | Infrastruktur in `kombination.yaml` definieren |
| **Unifier Engine** | Specs zu validen OpenTofu-Konfigurationen auflösen |
| **Worker Management** | gRPC-Agents auf Remote-Nodes verwalten |
| **Workflow Orchestration** | Multi-Step Deployment-Automatisierung |
| **CUE Validation** | Schema-basierte Konfigurationsvalidierung |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           kombify Stack Core                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  REST API   │  │ gRPC Server │  │  Unifier    │  │ Job Queue   │    │
│  │  (5260)     │  │   (5263)    │  │   Engine    │  │  System     │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │           │
│         └────────────────┴────────────────┴────────────────┘           │
│                                   │                                     │
│                          ┌───────┴───────┐                             │
│                          │  PocketBase   │                             │
│                          │  (SQLite/WAL) │                             │
│                          └───────────────┘                             │
└─────────────────────────────────────────────────────────────────────────┘
                    │                               │
        ┌───────────┴───────────┐       ┌──────────┴──────────┐
        │                       │       │                      │
   ┌────▼────┐             ┌────▼────┐  │  ┌────────────────┐  │
   │ Frontend │             │ Agent 1 │  │  │    OpenTofu    │  │
   │ (5261)   │             │ (Node)  │  │  │    Runner      │  │
   └──────────┘             └─────────┘  │  └────────────────┘  │
                            ┌─────────┐  │                      │
                            │ Agent 2 │  │  ┌────────────────┐  │
                            │ (Node)  │  │  │   StackKits    │  │
                            └─────────┘  │  │   (External)   │  │
                                         │  └────────────────┘  │
                                         └─────────────────────┘
```

---

## Core Principles

### 1. Single-Stack Architecture

**1 kombify Stack = 1 Homelab**

- Eine Instanz verwaltet genau ein Homelab
- Ein Homelab kann mehrere physische Server (Nodes) umfassen
- Multi-Homelab-Szenarien erfordern mehrere Instanzen

### 2. Spec-Driven Flow

```
kombination.yaml  →  Unifier  →  OpenTofu  →  Infrastructure
    (Intent)         (CUE)       (IaC)         (Reality)
```

User Intent wird niemals automatisch modifiziert. Alle Transformationen erzeugen separate Artefakte.

### 3. Interface-First Design

Business-Logik-Änderungen beginnen mit `pkg/core` Interfaces. Implementierungen folgen den Verträgen.

---

## Service Ports

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Core API | 5260 | HTTP | REST API + embedded PocketBase Admin |
| App (UI) | 5261 | HTTP | SvelteKit Dashboard |
| gRPC | 5263 | gRPC/mTLS | Agent-Kommunikation |
| Docs | 5262 | HTTP | MkDocs Documentation (optional) |

---

## Dependencies

### Go Dependencies (Key)

```go
cuelang.org/go v0.15.1                    // CUE language support
github.com/pocketbase/pocketbase v0.34.2  // Embedded database
github.com/docker/docker v28.5.2          // Docker SDK
google.golang.org/grpc v1.77.0            // gRPC framework
github.com/aws/aws-sdk-go-v2              // AWS integration
github.com/Azure/azure-sdk-for-go         // Azure integration
```

### Frontend Dependencies

```json
{
  "@sveltejs/kit": "2.x",
  "tailwindcss": "4.x",
  "bits-ui": "latest",
  "lucide-svelte": "latest"
}
```

---

## API Reference

### Public Endpoints (via Kong Gateway)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/orchestrator/workflows` | GET/POST | Workflow management |
| `/v1/orchestrator/stacks` | GET/POST | Stack configurations |
| `/v1/orchestrator/nodes` | GET/POST | Node management |
| `/v1/orchestrator/workers` | GET/POST | Worker status |
| `/v1/orchestrator/jobs` | GET/POST | Job execution |

### Internal Endpoints (Admin Only)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/internal/sso/exchange` | POST | Kong SSO token exchange |
| `/api/internal/feature-flags/apply` | POST | Apply platform feature flags |

### gRPC Services

```protobuf
service AgentService {
  rpc Register(RegisterRequest) returns (RegisterResponse);
  rpc Heartbeat(HeartbeatRequest) returns (HeartbeatResponse);
  rpc CommandStream(stream CommandRequest) returns (stream CommandResponse);
}
```

---

## Directory Structure

```
KombiStack/
├── cmd/kombistack/         # Go application entry point
├── pkg/                    # Go packages (public APIs)
│   ├── api/                # HTTP handlers & response helpers
│   ├── core/               # Domain model & interfaces
│   ├── grpcserver/         # Agent communication
│   ├── unifier/            # CUE-based validation engine
│   ├── tofu/               # OpenTofu wrapper
│   ├── jobs/               # Async job queue
│   └── auth/               # Certificate management
├── internal/
│   ├── migrations/         # PocketBase collection definitions
│   └── orchestrator/       # Workflow engine
├── app/                    # SvelteKit frontend
│   └── src/
│       ├── lib/api.ts      # Frontend REST client
│       └── routes/         # SvelteKit routes
├── api/proto/              # gRPC protocol definitions
├── tofu/                   # OpenTofu templates
├── data/certs/             # mTLS certificates
└── docs/                   # Documentation
```

---

## Unifier Pipeline

### Three-Stage Spec Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Intent-Spec    │────▶│ Requirements-   │────▶│  Unified-Spec   │
│                 │     │     Spec        │     │                 │
│ User goals &    │     │ CPU, RAM,       │     │ Final validated │
│ high-level      │     │ storage,        │     │ configuration   │
│ constraints     │     │ network layout  │     │ for rollout     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Unifier Engine Responsibilities

1. **Validate** alle drei Spec-Stufen mit CUE vor dem Rollout
2. **Select** passende StackKits für den angeforderten Intent
3. **Perform** Service-Platzierung auf Worker-Nodes
4. **Generate** `kombination.yaml` als kanonische User-Spec
5. **Produce** Output-Artefakte für Downstream-Tools

---

## Worker System

### Agent Registration Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   1. Generate    │────▶│   2. Register    │────▶│   3. Ready       │
│   mTLS Certs     │     │   via gRPC       │     │   for Tasks      │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

1. **Generate** mTLS credentials from kombify Stack CA
2. **Register** via gRPC, announcing capabilities and resources
3. **Heartbeat** every ~30 seconds
4. **Execute** commands via bidirectional CommandStream

### Worker Capabilities

- Online/offline status and heartbeat timestamps
- Resource usage and capacity
- Supported features (virtualization, GPU, storage type)

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KOMBISTACK_PORT` | 5260 | Core API port |
| `KOMBISTACK_GRPC_PORT` | 5263 | gRPC server port |
| `KOMBISTACK_DATA_DIR` | ./data | Data directory |
| `KOMBISTACK_LOG_LEVEL` | info | Log level |
| `KOMBISTACK_DEV_MODE` | false | Development mode |

### Configuration File (kombistack.yaml)

```yaml
server:
  port: 5260
  grpc_port: 5263
  
database:
  path: ./data/pb_data
  
auth:
  cert_dir: ./data/certs
  
opentofu:
  binary: tofu
  state_dir: ./data/tfstate
```

---

## Self-Hosting Guide

### Docker Compose (Recommended)

```yaml
version: '3.8'
services:
  kombistack:
    image: ghcr.io/soulcreek/kombistack:latest
    ports:
      - "5260:5260"
      - "5263:5263"
    volumes:
      - kombistack-data:/app/data
    environment:
      - KOMBISTACK_LOG_LEVEL=info

  kombistack-ui:
    image: ghcr.io/soulcreek/kombistack-ui:latest
    ports:
      - "5261:5261"
    environment:
      - KOMBISTACK_API_URL=http://kombistack:5260

volumes:
  kombistack-data:
```

### Binary Installation

```bash
# Download latest release
curl -LO https://github.com/soulcreek/KombiStack/releases/latest/download/kombistack_linux_amd64.tar.gz

# Extract
tar -xzf kombistack_linux_amd64.tar.gz

# Run
./kombistack serve
```

---

## Development

### Quick Start

```bash
# Clone repository
git clone https://github.com/soulcreek/KombiStack.git
cd KombiStack

# Backend development
make dev  # API on http://localhost:5260

# Frontend development
make dev-frontend  # UI on http://localhost:5261

# Run tests
make test
make preflight  # Full CI check
```

### Useful Commands

```bash
make proto        # Regenerate gRPC code
make certs-init   # Create CA certificates
make certs-agent AGENT=agent-1  # Generate agent cert
make test-local   # Full integration test
```

---

## Related Documentation

- [kombify StackKits](../stackkits/ARCHITECTURE.md) - IaC Blueprints
- [kombify Sim](../sim/ARCHITECTURE.md) - Simulation Engine
- [Inter-Module Contracts](../../INTER_MODULE_CONTRACTS.md) - API Contracts

---

*Last reviewed: 2026-01-23*
