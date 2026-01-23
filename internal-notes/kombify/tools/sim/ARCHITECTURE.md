# kombify Sim - Technical Architecture

> **Version:** 2.0.0  
> **Last Updated:** 2026-01-23  
> **Repository:** KombiSim  
> **License:** MIT

---

## Module Identity

| Attribute | Value |
|-----------|-------|
| **Product Name** | kombify Sim |
| **Role** | Infrastructure Simulation Engine |
| **Primary Users** | Homelab planners, DevOps, Learners |
| **Tech Stack** | Go 1.24+, Docker, SvelteKit |

---

## Overview

**kombify Sim** ist die Simulations-Engine des kombify-Ökosystems — teste Homelab-Konfigurationen bevor du sie auf echter Hardware bereitstellst, indem du leichtgewichtige Docker-Container als "virtuelle Server" verwendest.

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **Docker Simulation** | Leichtgewichtige "VMs" mit Docker-Containern |
| **Real SSH Access** | SSH in simulierte Nodes (Ports 2222-2322) |
| **Simulation Groups** | Nodes in logische Simulationen organisieren |
| **Template Library** | Vordefinierte Templates für häufige Setups |
| **Node Types** | VPS vs. Local Server unterscheiden |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           kombify Sim                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                        Presentation Layer                          │ │
│  │                                                                    │ │
│  │  ┌─────────────────┐         ┌─────────────────┐                  │ │
│  │  │    Web UI       │         │    REST API     │                  │ │
│  │  │   (SvelteKit)   │────────▶│      (Go)       │                  │ │
│  │  │   Port: 5271    │         │   /api/v1/*     │                  │ │
│  │  └─────────────────┘         └────────┬────────┘                  │ │
│  └───────────────────────────────────────┼───────────────────────────┘ │
│                                          │                              │
│  ┌───────────────────────────────────────┼───────────────────────────┐ │
│  │                        Application Layer                    │      │ │
│  │                                          │                         │ │
│  │  ┌─────────────────┐         ┌──────────▼────────┐                │ │
│  │  │   Simulation    │         │      Node         │                │ │
│  │  │   Orchestrator  │◀───────▶│     Manager       │                │ │
│  │  │                 │         │                   │                │ │
│  │  └─────────────────┘         └──────────┬────────┘                │ │
│  └─────────────────────────────────────────┼─────────────────────────┘ │
│                                            │                            │
│  ┌─────────────────────────────────────────┼─────────────────────────┐ │
│  │                     Infrastructure Layer                    │      │ │
│  │                                            │                       │ │
│  │  ┌──────────────────────────────────────────────────────────────┐ │ │
│  │  │                    NodeEngine Interface                       │ │ │
│  │  │                                                               │ │ │
│  │  │  CreateNode() | StartNode() | StopNode() | DestroyNode()     │ │ │
│  │  │  GetNode() | ListNodes() | GetSSH()                          │ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  │                               │                                    │ │
│  │  ┌────────────┬───────────────┼───────────────┬────────────────┐  │ │
│  │  │            │               │               │                │  │ │
│  │  ▼            ▼               ▼               ▼                │  │ │
│  │  ┌────────┐  ┌────────┐   ┌────────┐   ┌──────────┐           │  │ │
│  │  │Container│ │ QEMU   │   │Firecracker│ │ External │           │  │ │
│  │  │ Engine │  │ Engine │   │ Engine │   │  Engine  │           │  │ │
│  │  │   ✅   │  │   🚧   │   │   🚧   │   │   🚧    │           │  │ │
│  │  └────┬───┘  └────┬───┘   └────┬───┘   └────┬─────┘           │  │ │
│  └───────┼───────────┼────────────┼─────────────┼─────────────────┘  │
│          │           │            │             │                     │
│          ▼           ▼            ▼             ▼                     │
│      Docker       QEMU        Firecracker   External API             │
│      Daemon       Process     Process       (Proxmox/Cloud)          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Service Ports

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Backend API | 5270 | HTTP | REST API |
| Frontend | 5271 | HTTP | SvelteKit Dashboard |
| SSH (Nodes) | 2222-2322 | SSH | Container SSH access |

---

## Engine Interface

Das `NodeEngine` Interface abstrahiert alle Backend-Implementierungen:

```go
type NodeEngine interface {
    CreateNode(config NodeConfig) (*Node, error)
    StartNode(id string) error
    StopNode(id string) error
    DestroyNode(id string) error
    GetNode(id string) (*Node, error)
    ListNodes() ([]*Node, error)
    GetSSH(id string) (*SSHInfo, error)
    Close() error
}
```

### Backend Engines

| Engine | Platform | Use Case | Status |
|--------|----------|----------|--------|
| **Container** | Any (Docker) | Development, CI/CD | ✅ Implemented |
| **QEMU** | Any | Cross-platform VMs | 🚧 Planned |
| **Firecracker** | Linux + KVM | Production, fast boot | 🚧 Planned |
| **External** | Any | BYO infrastructure | 🚧 Planned |

---

## API Reference

### Simulation Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/simulations` | GET | List all simulations |
| `/api/v1/simulations` | POST | Create simulation |
| `/api/v1/simulations/{id}` | GET | Get simulation details |
| `/api/v1/simulations/{id}` | DELETE | Delete simulation |
| `/api/v1/simulations/{id}/start` | POST | Start all nodes |
| `/api/v1/simulations/{id}/stop` | POST | Stop all nodes |

### Node Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/nodes` | GET | List all nodes |
| `/api/v1/nodes` | POST | Create node |
| `/api/v1/nodes/{id}` | GET | Get node details |
| `/api/v1/nodes/{id}` | DELETE | Delete node |
| `/api/v1/nodes/{id}/start` | POST | Start node |
| `/api/v1/nodes/{id}/stop` | POST | Stop node |
| `/api/v1/nodes/{id}/ssh` | GET | Get SSH credentials |

### Template Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/templates` | GET | List available templates |
| `/api/v1/templates/{name}/apply` | POST | Apply template |

---

## Built-in Templates

| Template | Category | Nodes | Description |
|----------|----------|-------|-------------|
| `single-node` | development | 1 | Minimal single server |
| `homelab-basic` | homelab | 2 | Web server + Database |
| `homelab-advanced` | homelab | 5 | Full homelab stack |
| `hybrid-setup` | homelab | 5 | VPS + Local combined |
| `dev-environment` | development | 2 | Dev server + database |
| `ha-setup` | homelab | 5 | Load balancer + HA |

### Template Application Example

```bash
# Apply homelab-basic template
curl -X POST http://localhost:5270/api/v1/templates/homelab-basic/apply \
  -H "Content-Type: application/json" \
  -d '{
    "simulation_name": "my-test-lab",
    "auto_start": true
  }'
```

---

## Dependencies

### Go Dependencies

```go
github.com/docker/docker v27.4.1  // Docker SDK
github.com/google/uuid v1.6.0     // UUID generation
modernc.org/sqlite v1.40.1        // SQLite driver
```

---

## Directory Structure

```
KombiSim/
├── cmd/
│   └── kombisim/
│       └── main.go           # Entry point
│
├── pkg/
│   ├── api/
│   │   ├── server.go         # HTTP server & routing
│   │   └── handlers.go       # Request handlers
│   │
│   ├── config/
│   │   └── config.go         # Configuration loading
│   │
│   ├── simulation/
│   │   └── store.go          # SQLite persistence
│   │
│   └── engine/
│       ├── engine.go         # NodeEngine interface
│       ├── container.go      # Docker-based engine
│       ├── qemu.go           # QEMU engine (planned)
│       └── external.go       # External API engine
│
├── app/                      # SvelteKit frontend
│   └── src/
│
└── docs/
```

---

## Data Flow

### Create Node Flow

```
User Request → API Handler → Engine.CreateNode() → Docker Create
     │                              │
     │                              ▼
     │                     ┌────────────────┐
     │                     │ Container:     │
     │                     │ docker create  │
     │                     │ + SSH daemon   │
     │                     │ + Port mapping │
     │                     └────────────────┘
     │                              │
     ▼                              ▼
JSON Response ◀──────────── Node object
```

### SSH Access Flow

```
User → SSH Client → Host:2222 → Container:22
                         │
                         │ Port forwarding:
                         │ 2222 → Container 1
                         │ 2223 → Container 2
                         │ ...
                         ▼
                    ┌──────────┐
                    │ Node SSH │
                    │  Daemon  │
                    └──────────┘
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KOMBISIM_PORT` | 5270 | API server port |
| `KOMBISIM_DATA_DIR` | ./data | Data directory |
| `KOMBISIM_ENGINE` | container | Backend engine |
| `KOMBISIM_LOG_LEVEL` | info | Log level |
| `KOMBISIM_STATIC_DIR` | ./static | Static file directory |

### Configuration File (kombisim.yaml)

```yaml
server:
  port: 5270
  
database:
  path: ./data/kombisim.db
  
engine:
  type: container
  docker_host: unix:///var/run/docker.sock
  
ssh:
  base_port: 2222
  max_nodes: 100
```

---

## Self-Hosting Guide

### Docker Compose (Recommended)

```yaml
version: '3.8'
services:
  kombisim:
    image: ghcr.io/soulcreek/kombisim:latest
    ports:
      - "5270:5270"
      - "2222-2322:2222-2322"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - kombisim-data:/app/data
    environment:
      - KOMBISIM_LOG_LEVEL=info

volumes:
  kombisim-data:
```

### Binary Installation

```bash
# Download latest release
curl -LO https://github.com/soulcreek/KombiSim/releases/latest/download/kombisim_linux_amd64.tar.gz

# Extract
tar -xzf kombisim_linux_amd64.tar.gz

# Run (requires Docker daemon)
./kombisim serve
```

---

## Usage Examples

### Create a Single Node

```bash
curl -X POST http://localhost:5270/api/v1/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "web-server",
    "type": "vps",
    "os": "ubuntu-22.04",
    "resources": {
      "cpu": 2,
      "memory": "2GB",
      "disk": "20GB"
    }
  }'
```

### SSH into a Node

```bash
# Get SSH info
curl http://localhost:5270/api/v1/nodes/{id}/ssh

# Connect
ssh -p 2222 root@localhost
# Password: kombisim
```

### Create Full Simulation

```bash
# Create simulation
curl -X POST http://localhost:5270/api/v1/simulations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production-test",
    "description": "Testing production-like setup"
  }'

# Add nodes to simulation
curl -X POST http://localhost:5270/api/v1/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "load-balancer",
    "simulation_id": "sim-uuid",
    "type": "vps"
  }'

# Start entire simulation
curl -X POST http://localhost:5270/api/v1/simulations/{id}/start
```

---

## Development

### Quick Start

```bash
# Clone repository
git clone https://github.com/soulcreek/KombiSim.git
cd KombiSim

# Backend development
make dev  # API on http://localhost:5270

# Frontend development (separate terminal)
make dev-frontend  # UI on http://localhost:5271

# Run tests
make test
make test-quick  # Only pkg tests
```

### Useful Commands

```bash
make build        # Build binary
make docker       # Build Docker image
make test-local   # Full integration test
```

---

## Integration with kombify Stack

kombify Sim kann als Simulation-Backend für kombify Stack verwendet werden:

```yaml
# In kombify Stack config
simulation:
  enabled: true
  endpoint: http://kombisim:5270
  auto_create: true
```

Dies ermöglicht:
- Pre-deployment Testing von StackKits
- Validierung von Netzwerk-Konfigurationen
- Training und Dokumentation

---

## Related Documentation

- [kombify Stack](../stack/ARCHITECTURE.md) - Control Plane
- [kombify StackKits](../stackkits/ARCHITECTURE.md) - IaC Blueprints
- [Inter-Module Contracts](../../INTER_MODULE_CONTRACTS.md) - API Contracts

---

*Last reviewed: 2026-01-23*
