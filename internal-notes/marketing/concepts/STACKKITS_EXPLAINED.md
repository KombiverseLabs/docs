# StackKits Explained

> **Was sind StackKits?** Vordefinierte, validierte Blueprints für dein Homelab.

---

## Das Problem

Du willst ein Homelab aufsetzen. Du hast gehört von:
- Traefik (oder Caddy? oder nginx?)
- Authelia (oder Authentik? oder Keycloak?)
- Portainer (oder Dockge? oder Coolify?)
- Immich (oder Photoprism?)

**Fragen über Fragen:**
- Welche Tools arbeiten gut zusammen?
- Wie konfiguriere ich sie richtig?
- Was sind die best practices?
- Wie vermeide ich Security-Lücken?

---

## Die Lösung: StackKits

Ein **StackKit** ist ein vordefiniertes, getestetes Set von:
- **Services** — Welche Tools enthalten sind
- **Konfiguration** — Wie sie zusammenarbeiten
- **Defaults** — Sinnvolle Standardwerte
- **Constraints** — Was zusammen funktioniert (und was nicht)

### Beispiel: `base-homelab`

```
┌────────────────────────────────────────────────────────────────┐
│                      BASE-HOMELAB STACKKIT                      │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Included Services:                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Traefik  │ │ Authelia │ │ Homepage │ │ Portainer Agent  │  │
│  │ (Proxy)  │ │  (Auth)  │ │(Dashboard│ │  (Management)    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│                                                                 │
│  Pre-configured:                                                │
│  • Traefik routes all services                                 │
│  • Authelia protects sensitive endpoints                       │
│  • Homepage auto-discovers services                            │
│  • SSL via Let's Encrypt                                       │
│                                                                 │
│  You configure:                                                 │
│  • Your domain (home.local)                                    │
│  • Your email (for SSL)                                        │
│  • Your users (admin, family, etc.)                            │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Verfügbare StackKits

| StackKit | Zielgruppe | Services | Fokus |
|----------|------------|----------|-------|
| **base-homelab** | Einsteiger | 4-6 | Einfachheit |
| **ha-homelab** | Fortgeschritten | 8-12 | High Availability |
| **modern-homelab** | Power User | 15+ | Cutting Edge |
| **media-stack** | Media Server | 5-8 | Jellyfin, *arr |
| **ai-stack** | AI Enthusiasten | 3-5 | Ollama, WebUI |

---

## Wie funktionieren StackKits?

### 1. CUE Schema Definition

Jeder StackKit ist in [CUE](https://cuelang.org/) definiert:

```cue
// base-homelab/stack.cue
package base_homelab

import "kombify.dev/base"

#Stack: base.#Stack & {
    services: {
        traefik: #TraefikService
        authelia: #AutheliaService
        homepage: #HomepageService
    }
    
    // Constraint: Authelia benötigt Traefik
    if services.authelia != _|_ {
        services.traefik: _
    }
}

#TraefikService: base.#Service & {
    image: "traefik:v3.0"
    ports: [80, 443]
    // ... weitere Definitionen
}
```

### 2. Validierung

Wenn du `kombify validate` ausführst:

```
✓ YAML Syntax valid
✓ Required fields present
✓ Service dependencies satisfied
✓ Port conflicts: none
✓ Network configuration: valid
✓ SSL configuration: valid
```

### 3. Generation

Der Unifier generiert aus dem StackKit:
- `docker-compose.yml` mit allen Services
- `traefik/` Konfiguration
- `authelia/configuration.yml`
- OpenTofu-Code (wenn Infra-Provisioning nötig)

---

## StackKit Anatomie

```
stackkits/
└── base-homelab/
    ├── README.md           # Dokumentation
    ├── stack.cue           # Haupt-Schema
    ├── services/
    │   ├── traefik.cue     # Traefik-Definition
    │   ├── authelia.cue    # Authelia-Definition
    │   └── homepage.cue    # Homepage-Definition
    ├── defaults/
    │   └── values.cue      # Standard-Werte
    └── examples/
        ├── minimal.yaml    # Minimales Beispiel
        └── full.yaml       # Alle Optionen
```

---

## Eigene StackKits erstellen

### 1. Fork eines bestehenden StackKits

```bash
kombify stackkit fork base-homelab my-custom-stack
```

### 2. Services hinzufügen/entfernen

```cue
// my-custom-stack/stack.cue
package my_custom_stack

import "kombify.dev/base"
import "kombify.dev/base-homelab"

#Stack: base_homelab.#Stack & {
    // Immich hinzufügen
    services: immich: #ImmichService
    
    // Homepage entfernen (optional)
    services: homepage: _|_
}
```

### 3. Testen

```bash
kombify stackkit test my-custom-stack
```

### 4. Veröffentlichen (optional)

```bash
kombify stackkit publish my-custom-stack
```

---

## StackKit vs. Docker Compose Template

| Aspekt | Docker Compose Template | StackKit |
|--------|------------------------|----------|
| **Format** | YAML | CUE + YAML |
| **Validierung** | Keine | Schema-basiert |
| **Anpassung** | Copy & Paste | Vererbung |
| **Defaults** | Hardcoded | Überschreibbar |
| **Dependencies** | Manual | Automatisch |
| **Updates** | Manuell | `kombify update` |

---

## FAQ

### Kann ich Services hinzufügen, die nicht im StackKit sind?

Ja! StackKits sind erweiterbar:

```yaml
# kombination.yaml
stackkit: base-homelab

# Zusätzliche Services
services:
  - jellyfin        # Nicht in base-homelab
  - vaultwarden     # Nicht in base-homelab
```

### Was passiert bei StackKit-Updates?

```bash
kombify stackkit update base-homelab
# → Zeigt Diff
# → Du entscheidest, was übernommen wird
```

### Kann ich mehrere StackKits kombinieren?

Aktuell nicht empfohlen (Konflikte). Stattdessen:
1. Einen StackKit als Basis wählen
2. Einzelne Services hinzufügen

---

## Nächste Schritte

1. **[Verfügbare StackKits](/stackkits/catalog)** — Alle StackKits im Überblick
2. **[CUE Basics](/concepts/cue-basics)** — CUE-Sprache verstehen
3. **[Custom StackKit erstellen](/guides/custom-stackkit)** — Schritt-für-Schritt

---

*"Don't reinvent the wheel — pick a StackKit."*
