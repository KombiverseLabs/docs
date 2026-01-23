# What is kombify?

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-23  
> **Audience:** New Users

---

## The Short Version

**kombify** ist ein Ökosystem für Homelab- und Self-Hosting-Infrastruktur, das dir ermöglicht:

1. **Definieren** — Beschreibe dein gesamtes Setup in einer YAML-Datei
2. **Simulieren** — Teste es in virtuellen Containern bevor du echte Hardware anfasst
3. **Validieren** — Lass Fehler finden, bevor sie Probleme machen
4. **Deployen** — Provisioniere alles mit einem Klick
5. **Verwalten** — Überwache und aktualisiere über ein Dashboard

---

## The kombify Ecosystem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         kombify Ecosystem                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────── Benutzer ──────────────────────────────────────┐   │
│  │                                                                       │   │
│  │    "Ich will ein Homelab mit Fotos, AI und Smart Home"              │   │
│  │                                                                       │   │
│  └───────────────────────────────┬───────────────────────────────────────┘   │
│                                  │                                           │
│                                  ▼                                           │
│  ┌────────────────────── kombify Sphere (SaaS) ───────────────────────┐     │
│  │                                                                     │     │
│  │    🌐 Web Portal  │  👤 Account  │  💳 Billing  │  📊 Dashboard   │     │
│  │                                                                     │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                  │                                           │
│                                  ▼                                           │
│  ┌────────────────────── Open Source Tools ───────────────────────────┐     │
│  │                                                                     │     │
│  │   ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐  │     │
│  │   │kombify Stack │   │ kombify Sim  │   │ kombify StackKits    │  │     │
│  │   │              │   │              │   │                      │  │     │
│  │   │ Orchestriert │   │ Simuliert    │   │ Blueprints für       │  │     │
│  │   │ dein Homelab │   │ vor Deploy   │   │ typische Setups      │  │     │
│  │   └──────────────┘   └──────────────┘   └──────────────────────┘  │     │
│  │                                                                     │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                  │                                           │
│                                  ▼                                           │
│  ┌────────────────────── Deine Infrastruktur ─────────────────────────┐     │
│  │                                                                     │     │
│  │    🏠 Home Server  │  ☁️ Cloud VPS  │  🔗 VPN Mesh              │     │
│  │                                                                     │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Die Tools erklärt

### 🔧 kombify Stack

**Was es ist:** Die zentrale Steuerung für dein Homelab.

**Was es macht:**
- Liest deine `kombination.yaml`
- Validiert die Konfiguration
- Generiert Infrastructure-as-Code (OpenTofu)
- Deployt Services auf deine Server
- Überwacht den Zustand

**Analogie:** Der "Dirigent" deines Homelab-Orchesters.

---

### 🧪 kombify Sim

**Was es ist:** Ein Simulator für Infrastruktur.

**Was es macht:**
- Erstellt Docker-Container, die sich wie echte Server verhalten
- Ermöglicht SSH-Zugang zu "virtuellen Servern"
- Testet Netzwerk- und Service-Konfigurationen
- Hilft beim Lernen ohne Risiko

**Analogie:** Ein "Flugsimulator" für dein Homelab.

---

### 📦 kombify StackKits

**Was sie sind:** Vordefinierte Blueprints für häufige Setups.

**Was sie enthalten:**
- CUE-Schemata für Validierung
- Default-Konfigurationen für Services
- Best Practices eingebaut
- Varianten für verschiedene Hardware

**Analogie:** "Rezepte" für dein Homelab.

---

### 🌐 kombify Sphere

**Was es ist:** Das SaaS-Portal für kombify.

**Was es bietet:**
- Gehostete Version von kombify Stack
- Account-Management
- Billing und Subscriptions
- SSO für alle Tools

**Analogie:** Die "Cloud-Console" für dein Self-Hosting.

---

### ⚙️ kombify Administration

**Was es ist:** Das Admin-Backend für die Plattform.

**Was es macht:**
- Tools-Katalog verwalten
- User-Administration
- Feature-Flags
- Support-Tickets

**Für:** Plattform-Betreiber, nicht Endnutzer.

---

### 🔌 kombify API

**Was es ist:** Das API-Gateway der Plattform.

**Was es macht:**
- Authentifizierung (JWT via Zitadel)
- Rate Limiting
- Request Routing
- Security Headers

**Für:** Entwickler und Integrationen.

---

## Der Workflow

### 1. Beschreiben

Du beschreibst, was du willst — entweder per Wizard oder YAML:

```yaml
# kombination.yaml
stackkit: modern-homelab
name: "Mein Homelab"

intent:
  purpose: photo-cloud
  users: 4
  
nodes:
  - name: home-server
    type: local
```

### 2. Validieren

kombify prüft deine Konfiguration gegen das StackKit-Schema:

```
✅ Syntax valid
✅ All required fields present
✅ Resource requirements met
✅ Network configuration valid
```

### 3. Simulieren (Optional)

Teste dein Setup in virtuellen Containern:

```bash
kombisim start
# SSH into simulated servers
ssh -p 2222 root@localhost
```

### 4. Deployen

Provisioniere deine echte Infrastruktur:

```bash
kombistack apply
```

### 5. Verwalten

Dashboard für Monitoring und Updates:

```
┌─────────────────────────────────────────────┐
│           kombify Dashboard                  │
├─────────────────────────────────────────────┤
│                                             │
│  🟢 home-server     │  CPU: 23%  RAM: 45%  │
│  🟢 cloud-vps       │  CPU: 12%  RAM: 30%  │
│                                             │
│  Services: 12 running, 0 failed             │
│  Last backup: 2 hours ago                   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Was macht kombify anders?

| Feature | kombify | Andere Tools |
|---------|---------|--------------|
| **Spec-Driven** | Eine YAML = alles | Configs überall verstreut |
| **Simulation** | Eingebaut | Nicht vorhanden |
| **Validation** | Vor dem Deploy (CUE) | Oft erst zur Runtime |
| **Hybrid Support** | Kernfeature | Oft nachträglich |
| **Open Source** | Core Tools = MIT | Oft proprietär |

---

## Für wen ist kombify?

### Homelab-Enthusiasten

Du hast einen alten PC oder NUC und willst:
- Fotos selbst hosten (Immich)
- Medien streamen (Jellyfin)
- Smart Home steuern (Home Assistant)
- AI lokal nutzen (Ollama)

**kombify hilft:** Setup in Minuten statt Stunden.

### Self-Hosting Developers

Du deployst eigene Projekte und willst:
- VPS + lokale Hardware kombinieren
- Reproduzierbare Setups
- CI/CD für Infrastruktur

**kombify hilft:** GitOps für Self-Hosting.

### Small Teams

Ihr habt begrenzte DevOps-Ressourcen und wollt:
- Standardisierte Setups
- Einfaches Onboarding
- Zentrale Verwaltung

**kombify hilft:** Dokumentation ist die Spec.

---

## Nächste Schritte

→ [Why kombify?](./WHY_KOMBIFY.md) — Warum kombify existiert

→ [Get Started](../getting-started/FIRST_HOMELAB.md) — Dein erstes Homelab

→ [Choose a StackKit](../getting-started/CHOOSING_A_STACKKIT.md) — Finde das richtige Blueprint

---

*Built with ❤️ for the Self-Hosting Community*
