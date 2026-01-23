# Spec-Driven Infrastructure

> **Core Concept:** Define your intent in YAML, let the system handle implementation.

---

## What is Spec-Driven?

**Spec-Driven Infrastructure** ist das Kernprinzip hinter kombify — du beschreibst *was* du willst, nicht *wie* es umgesetzt wird.

```yaml
# kombination.yaml - Das ist alles, was du schreibst
stack:
  name: my-homelab
  domain: home.local

nodes:
  - hostname: proxmox-1
    type: proxmox
    role: hypervisor

services:
  - traefik      # Reverse Proxy
  - authelia     # SSO
  - homepage     # Dashboard
  - immich       # Photos
```

**Das Ergebnis:**
- OpenTofu/Terraform-Code wird automatisch generiert
- Container werden mit korrekten Netzwerken deployed
- SSL-Zertifikate werden eingerichtet
- Routing-Regeln werden konfiguriert

---

## Warum Spec-Driven?

### 1. Reduzierte Komplexität

**Traditionell:**
- 50+ Zeilen docker-compose.yml
- 100+ Zeilen Traefik-Konfiguration
- Manuelle DNS-Einträge
- SSL-Zertifikat-Management

**Mit kombify:**
- 15 Zeilen kombination.yaml
- Alles andere wird abgeleitet

### 2. Konsistenz

Jede Änderung durchläuft denselben Validation-Prozess:
1. CUE-Schema-Validierung
2. Dependency-Check
3. Dry-Run (optional)
4. Apply

### 3. Reproduzierbarkeit

Deine `kombination.yaml` ist die **Single Source of Truth**:
- Version-kontrollierbar
- Teilbar mit der Community
- Wiederherstellbar nach Disaster

---

## Der Unifier Engine

```
┌────────────────────────────────────────────────────────────────┐
│                        UNIFIER ENGINE                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  kombination.yaml                                               │
│        │                                                        │
│        ▼                                                        │
│  ┌────────────┐                                                │
│  │   Parse    │ ← YAML → Go structs                            │
│  └─────┬──────┘                                                │
│        ▼                                                        │
│  ┌────────────┐     ┌────────────────┐                         │
│  │  Validate  │────▶│  CUE Schemas   │                         │
│  │            │     │  (StackKits)   │                         │
│  └─────┬──────┘     └────────────────┘                         │
│        ▼                                                        │
│  ┌────────────┐                                                │
│  │  Resolve   │ ← Defaults, Dependencies, Secrets              │
│  └─────┬──────┘                                                │
│        ▼                                                        │
│  ┌────────────┐     ┌────────────────┐                         │
│  │  Generate  │────▶│  OpenTofu HCL  │                         │
│  │            │     │  + tfvars.json │                         │
│  └─────┬──────┘     └────────────────┘                         │
│        ▼                                                        │
│  ┌────────────┐                                                │
│  │   Apply    │ ← tofu plan → tofu apply                       │
│  └────────────┘                                                │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Vergleich: Traditionell vs. Spec-Driven

### Traefik + Authelia Setup

**Traditionell (docker-compose.yml):**

```yaml
# 80+ Zeilen für zwei Services...
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--api.dashboard=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=..."
      - "--certificatesresolvers.letsencrypt.acme.storage=..."
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=..."
      # ... 20 weitere Zeilen
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`traefik.home.local`)"
      # ... 15 weitere Zeilen
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/acme.json:/acme.json
      # ...
    ports:
      - "80:80"
      - "443:443"
    networks:
      - proxy

  authelia:
    image: authelia/authelia:latest
    volumes:
      - ./authelia/configuration.yml:/config/configuration.yml
      - ./authelia/users.yml:/config/users.yml
      # ...
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.authelia.rule=Host(`auth.home.local`)"
      # ... 20 weitere Zeilen für Middleware
    # ...
```

**Plus:** `authelia/configuration.yml` (100+ Zeilen), `traefik/traefik.yml`, etc.

**Mit kombify (kombination.yaml):**

```yaml
stack:
  domain: home.local
  email: admin@home.local

services:
  - traefik
  - authelia

auth:
  provider: authelia
  users:
    - username: admin
      # Password in secrets
```

**Das war's.** Der Unifier:
- Generiert die komplette docker-compose.yml
- Konfiguriert Traefik-Middleware für Authelia
- Setzt SSL mit Let's Encrypt auf
- Verknüpft alles korrekt

---

## Wann Spec-Driven nutzen?

### ✅ Ideal für:

- **Neue Homelabs** — Schneller Start ohne Config-Marathon
- **Reproduzierbare Setups** — Disaster Recovery, Multi-Site
- **Learning** — Verstehe best practices durch generierte Configs
- **Teams** — Einheitliche Standards

### ⚠️ Weniger geeignet für:

- **Hochgradig custom Setups** — Wenn jeder Service einzigartig ist
- **Legacy-Migration** — Bestehende Configs müssen konvertiert werden
- **Bleeding Edge** — Neueste Features brauchen manchmal manuelle Config

---

## Nächste Schritte

1. **[Quick Start](/quickstart)** — Erstes kombify-Setup in 5 Minuten
2. **[StackKits erklärt](/concepts/stackkits-explained)** — Die CUE-Schemas verstehen
3. **[kombination.yaml Reference](/reference/kombination)** — Alle Optionen

---

*"Describe what you want, not how to do it."*
