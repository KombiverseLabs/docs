# kombify Documentation - Master Index

> **Version:** 2.0.0  
> **Last Updated:** 2026-01-23  
> **Status:** Living Document

---

## 📚 About This Documentation

Diese internal-notes dienen als **zentrale Vorlage** für die öffentliche Mintlify-Dokumentation. Sie sind in zwei Hauptbereiche unterteilt:

| Bereich | Zweck | Zielgruppe |
|---------|-------|------------|
| **[kombify/](kombify/)** | Technische Dokumentation, APIs, Architekturen, Abhängigkeiten | Entwickler, DevOps, Contributors |
| **[marketing/](marketing/)** | Produktphilosophie, Einführungen, Tutorials, Warum-Erklärungen | Endbenutzer, Homelab-Enthusiasten |

---

## 🎯 kombify Produktfamilie

### Brand Hierarchy

```
kombify (Dachmarke)
├── kombify Stack      → Hybrid Infrastructure Control Plane
├── kombify Sim        → Infrastructure Simulation Engine  
├── kombify StackKits  → Declarative IaC Blueprints
├── kombify Sphere     → User Portal & SaaS Platform
├── kombify Administration → Admin Center & Tools Catalog
└── kombify API        → Central API Gateway
```

### Repository Mapping

| Product Name | Repository | License | Primary Tech |
|--------------|------------|---------|--------------|
| **kombify Stack** | KombiStack | MIT + AGPL-3.0 | Go, PocketBase, SvelteKit |
| **kombify Sim** | KombiSim | MIT | Go, Docker, SvelteKit |
| **kombify StackKits** | StackKits | MIT | CUE, OpenTofu, Go |
| **kombify Sphere** | KombiSphere-Cloud | Proprietary | SvelteKit, Prisma, Stripe |
| **kombify Administration** | KombiSphere-Admin | BSL-1.1 | Go, PocketBase, SvelteKit |
| **kombify API** | KombiSphere-API | MIT | Kong Gateway |

---

## 📁 Dokumentationsstruktur

### kombify/ (Technische Dokumentation)

```
kombify/
├── PLATFORM_OVERVIEW.md        # Gesamtübersicht der Plattform
├── UNIFIED_ARCHITECTURE.md     # Systemweite Architektur
├── INTER_MODULE_CONTRACTS.md   # API-Verträge zwischen Modulen
├── UNIFIED_DATA_ARCHITECTURE.md # Datenbank- und Storage-Konzepte
│
├── tools/                      # Tool-spezifische Dokumentation
│   ├── stack/                  # kombify Stack
│   │   ├── ARCHITECTURE.md
│   │   ├── API_REFERENCE.md
│   │   ├── CONFIGURATION.md
│   │   └── DEVELOPMENT.md
│   │
│   ├── sim/                    # kombify Sim
│   │   ├── ARCHITECTURE.md
│   │   ├── API_REFERENCE.md
│   │   └── TEMPLATES.md
│   │
│   ├── stackkits/              # kombify StackKits
│   │   ├── ARCHITECTURE.md
│   │   ├── SCHEMA_REFERENCE.md
│   │   └── BLUEPRINTS.md
│   │
│   ├── sphere/                 # kombify Sphere
│   │   ├── ARCHITECTURE.md
│   │   ├── API_REFERENCE.md
│   │   └── BILLING.md
│   │
│   ├── administration/         # kombify Administration
│   │   ├── ARCHITECTURE.md
│   │   ├── API_REFERENCE.md
│   │   └── TOOLS_CATALOG.md
│   │
│   └── api-gateway/            # kombify API
│       ├── ARCHITECTURE.md
│       ├── ROUTES.md
│       └── AUTHENTICATION.md
│
├── guides/                     # Entwickler-Guides
│   ├── CONTRIBUTING.md
│   ├── CODE_STYLE.md
│   └── TESTING.md
│
└── reference/                  # Referenz-Dokumentation
    ├── PORTS_AND_SERVICES.md
    ├── ENVIRONMENT_VARIABLES.md
    └── FEATURE_FLAGS.md
```

### marketing/ (Marketing & Einführung)

```
marketing/
├── PHILOSOPHY.md               # Produktphilosophie und Vision
├── WHY_KOMBIFY.md              # Warum kombify? Value Propositions
│
├── introduction/               # Einführungen
│   ├── WHAT_IS_KOMBIFY.md      # Was ist kombify?
│   ├── HOMELAB_PRIMER.md       # Homelab-Einführung für Anfänger
│   ├── TARGET_USERS.md         # Für wen ist kombify?
│   └── USE_CASES.md            # Anwendungsfälle
│
├── getting-started/            # Schnelleinstiege
│   ├── FIRST_HOMELAB.md        # Erste Schritte ✅
│   ├── 5_MINUTE_SETUP.md       # Quick Start Guide
│   └── CHOOSING_A_STACKKIT.md  # StackKit auswählen
│
├── concepts/                   # Konzept-Erklärungen
│   ├── SPEC_DRIVEN.md          # Spec-Driven Architektur ✅
│   ├── STACKKITS_EXPLAINED.md  # Was sind StackKits? ✅
│   ├── UNIFIER_MAGIC.md        # Der Unifier erklärt
│   └── HYBRID_HOMELAB.md       # Hybrid Cloud + Local
│
└── product-tours/              # Tool-Touren (Marketing-Stil)
    ├── STACK_TOUR.md           # kombify Stack Tour ✅
    ├── SIM_TOUR.md             # kombify Sim Tour ✅
    ├── STACKKITS_TOUR.md       # StackKits Tour
    └── SPHERE_TOUR.md          # Sphere SaaS Tour
```

---

## 🏗️ Mintlify Struktur-Vorschlag

Siehe **[MINTLIFY_STRUCTURE.md](MINTLIFY_STRUCTURE.md)** für die vollständige Mintlify-Konfiguration inkl. `mint.json` und OpenAPI-Specs.

### Navigation Groups (Kurzfassung)

```json
{
  "navigation": [
    {
      "group": "Getting Started",
      "pages": ["introduction", "quickstart", "quickstart-selfhosted"]
    },
    {
      "group": "kombify Sphere (SaaS)",
      "pages": ["sphere/overview", "sphere/auth/*", "sphere/dashboard", "sphere/billing"]
    },
    {
      "group": "kombify Stack",
      "pages": ["stack/overview", "stack/install/*", "stack/configuration", "stack/agents"]
    },
    {
      "group": "kombify Sim",
      "pages": ["sim/overview", "sim/install/*", "sim/templates", "sim/ssh"]
    },
    {
      "group": "kombify StackKits",
      "pages": ["stackkits/overview", "stackkits/writing-cue", "stackkits/builtin/*"]
    },
    {
      "group": "API Reference",
      "tabs": true,
      "pages": ["api-reference/stack/*", "api-reference/sim/*", "api-reference/stackkits/*"]
    },
    {
      "group": "Concepts",
      "pages": ["concepts/architecture", "concepts/spec-driven", "concepts/security"]
    }
  ]
}
```

---

## 🔗 Quick Links

### Technische Dokumentation (kombify/)
- [Platform Overview](kombify/PLATFORM_OVERVIEW.md)
- [Inter-Module Contracts](kombify/INTER_MODULE_CONTRACTS.md)

### Tool-Architekturen
- [kombify Stack](kombify/tools/stack/ARCHITECTURE.md) ✅
- [kombify Sim](kombify/tools/sim/ARCHITECTURE.md) ✅
- [kombify StackKits](kombify/tools/stackkits/ARCHITECTURE.md) ✅
- [kombify Sphere](kombify/tools/sphere/ARCHITECTURE.md) ✅
- [kombify Administration](kombify/tools/administration/ARCHITECTURE.md) ✅
- [kombify API](kombify/tools/api-gateway/ARCHITECTURE.md) ✅

### Marketing & Einführung
- [Product Philosophy](marketing/PHILOSOPHY.md) ✅
- [Why kombify?](marketing/WHY_KOMBIFY.md) ✅
- [What is kombify?](marketing/introduction/WHAT_IS_KOMBIFY.md) ✅
- [First Homelab](marketing/getting-started/FIRST_HOMELAB.md) ✅

### Konzepte
- [Spec-Driven Infrastructure](marketing/concepts/SPEC_DRIVEN.md) ✅
- [StackKits Explained](marketing/concepts/STACKKITS_EXPLAINED.md) ✅

### Product Tours
- [Stack Tour](marketing/product-tours/STACK_TOUR.md) ✅
- [Sim Tour](marketing/product-tours/SIM_TOUR.md) ✅

### Mintlify-Konfiguration
- [Mintlify Structure Proposal](MINTLIFY_STRUCTURE.md) ✅

---

## ✅ Status-Legende

| Symbol | Bedeutung |
|--------|-----------|
| ✅ | Vollständig erstellt |
| 🔄 | In Bearbeitung |
| ⏳ | Geplant |
| ❌ | Veraltet/zu entfernen |

---

*Maintained by the kombify Team*

