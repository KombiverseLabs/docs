# Why kombify?

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-23  
> **Audience:** Prospective Users

---

## The Problem We Solve

### 🤯 Homelab Setup Is Overwhelming

Du willst einen kleinen Server zu Hause betreiben. Klingt einfach, oder?

Dann findest du heraus, dass du brauchst:
- Reverse Proxy (Traefik? Caddy? Nginx?)
- SSL-Zertifikate (Let's Encrypt? Wildcard?)
- DNS-Management (Pi-hole? AdGuard?)
- Container-Runtime (Docker? Podman?)
- Monitoring (Prometheus? Netdata? Uptime Kuma?)
- Backup-Strategie (Restic? Borg? Duplicati?)
- VPN für Remote-Zugriff (Tailscale? WireGuard?)
- Und dann noch die eigentlichen Services...

**Ergebnis:** 50+ Tabs im Browser, 20+ YouTube-Videos, und nach einem Wochenende läuft immer noch nichts.

### 🔄 Configuration Drift Is Real

Du hast es geschafft — dein Homelab läuft! 🎉

Dann:
- Ein Update bricht was
- Du änderst "nur kurz" eine Einstellung
- 6 Monate später weißt du nicht mehr, was wo konfiguriert ist
- Ein Restore wäre... kompliziert

**Ergebnis:** Dein Homelab ist ein fragiles Kartenhaus.

### 🌐 Hybrid Is Hard

Du hast einen Server zu Hause und einen VPS in der Cloud. Logisch, oder?

- Wie verbindest du sie sicher?
- Welche Services wo?
- DNS-Routing zwischen beiden?
- Failover?

**Ergebnis:** Entweder alles lokal (unpraktisch) oder alles cloud (teuer).

---

## How kombify Helps

### ✨ One Spec, Complete Infrastructure

```yaml
# Das ist dein gesamtes Homelab
stackkit: modern-homelab
name: "Mein Setup"

nodes:
  - name: home-server
    type: local
    services: [storage, smarthome]
    
  - name: cloud-vps
    type: vps
    provider: hetzner
    services: [proxy, public-apps]
```

**Was passiert:**
1. kombify validiert die Konfiguration
2. Generiert OpenTofu-Code
3. Provisioniert den VPS
4. Installiert Agents auf beiden Nodes
5. Deployt die Services
6. Konfiguriert Networking automatisch

**Keine** 50 einzelnen Configs. **Eine** Quelle der Wahrheit.

### 🧪 Test Before You Deploy

```bash
# Erstelle virtuelle Server (Docker-Container)
kombisim apply-template modern-homelab

# Sieh, wie dein Setup aussehen wird
kombisim status

# SSH rein und teste
ssh -p 2222 root@localhost

# Zufrieden? Jetzt echt deployen.
```

**Keine** Angst vor "was, wenn es nicht funktioniert?" **Simuliere** zuerst, deploye dann.

### 📦 Blueprints, Not Blank Pages

Du startest nicht bei Null. Wähle ein StackKit:

| Ich will... | StackKit | Du bekommst |
|-------------|----------|-------------|
| Einfach anfangen | `base-homelab` | Docker, Traefik, Monitoring |
| Lokal + Cloud | `modern-homelab` | Hybrid-Setup, VPN-Mesh |
| Hochverfügbar | `ha-homelab` | Swarm-Cluster, Replicas |

Jedes StackKit ist:
- ✅ Von Experten designt
- ✅ Mit CUE validiert
- ✅ In der Community getestet
- ✅ Dokumentiert

### 🔓 Open Source at the Core

```
┌─────────────────────────────────────────────┐
│               DEINE KONTROLLE                │
├─────────────────────────────────────────────┤
│                                             │
│  kombify Stack    ─────────────► MIT        │
│  kombify Sim      ─────────────► MIT        │
│  kombify StackKits ────────────► MIT        │
│                                             │
│  Du kannst:                                 │
│  • Selbst hosten                           │
│  • Forken und anpassen                     │
│  • Code inspizieren                        │
│  • Ohne uns weitermachen                   │
│                                             │
└─────────────────────────────────────────────┘
```

Wir verdienen nur, wenn du **freiwillig** kombify Sphere (SaaS) nutzt — nicht durch Lock-in.

---

## Comparison

### vs. Manual Setup

| Aspekt | Manuell | kombify |
|--------|---------|---------|
| Setup-Zeit | Stunden/Tage | Minuten |
| Dokumentation | Du musst es tun | Automatisch (Spec = Doku) |
| Reproduzierbarkeit | Schwierig | Ein Klick |
| Updates | Händisch | Orchestriert |
| Hybrid-Support | Komplex | Eingebaut |

### vs. Kubernetes

| Aspekt | Kubernetes | kombify |
|--------|------------|---------|
| Lernkurve | Steil | Flach |
| Minimale Nodes | 3 (praktisch) | 1 |
| Resource Overhead | Hoch | Minimal |
| Zielgruppe | Enterprise | Homelab |
| Komplexität | Hoch | Progressiv |

### vs. Portainer/Coolify/Dokploy

| Aspekt | Diese Tools | kombify |
|--------|-------------|---------|
| Scope | Container-Management | Full-Stack IaC |
| Multi-Node | Limitiert | Kernfeature |
| Validation | Runtime | Pre-deployment (CUE) |
| Simulation | Nein | Ja (kombify Sim) |
| Integration | Standalone | Teil eines Ökosystems |

**Übrigens:** Du kannst Coolify/Dokploy **mit** kombify verwenden! Sie sind als PaaS-Layer in StackKits integriert.

---

## Real-World Example

### Szenario: Family Photo Cloud

**Ziel:** Familienfotos selbst hosten mit Immich, erreichbar von überall, automatisches Backup.

**Traditioneller Weg:**

1. VPS mieten (1 Stunde recherchieren, 30 Min einrichten)
2. Docker installieren (30 Min)
3. Traefik konfigurieren (2 Stunden + Debugging)
4. SSL-Zertifikate (30 Min + Warten)
5. Immich deployen (1 Stunde + Debugging)
6. DNS konfigurieren (30 Min)
7. Backup-System aufsetzen (2 Stunden)
8. Monitoring (1 Stunde)
9. Dokumentation schreiben (nie)

**Gesamtzeit:** ~10 Stunden, fragmentierte Dokumentation, fragiles Setup

**kombify Weg:**

```yaml
# kombination.yaml
stackkit: base-homelab
name: "Family Photos"

intent:
  purpose: photo-cloud
  users: 4
  access: family
  backup: enabled

services:
  - immich:
      enabled: true
      storage: 500GB
```

```bash
# Validieren
kombistack validate

# Simulieren (optional)
kombisim start

# Deployen
kombistack apply
```

**Gesamtzeit:** ~30 Minuten, vollständig dokumentiert, reproduzierbar

---

## Getting Started

### 3 Wege, anzufangen

#### 1. Self-Hosted (Kostenlos)

```bash
# Docker Compose
curl -O https://raw.githubusercontent.com/soulcreek/KombiStack/main/docker-compose.yml
docker compose up -d

# Open http://localhost:5260
```

#### 2. kombify Sphere (SaaS)

1. Gehe zu [app.kombisphere.io](https://app.kombisphere.io)
2. Erstelle einen Account
3. Starte den Wizard

#### 3. CLI-First

```bash
# Install CLI
curl -sSL https://install.kombify.io | bash

# Initialize project
kombistack init --wizard
```

---

## FAQ

### Brauche ich Vorkenntnisse?

**Minimal.** Wenn du Docker-Container starten kannst, kannst du kombify nutzen. Der Easy Wizard führt dich durch alles.

### Kann ich meine bestehenden Setups migrieren?

**Ja.** Du kannst deine Docker-Compose-Files importieren oder manuell in eine `kombination.yaml` konvertieren.

### Was kostet das?

| Option | Preis |
|--------|-------|
| Self-Hosted (Open Source) | Kostenlos |
| kombify Sphere Free | €0/Monat |
| kombify Sphere Pro | €9/Monat |

### Kann ich kombify verlassen?

**Jederzeit.** Deine Infrastruktur gehört dir. Du kannst die generierten OpenTofu-Configs exportieren und ohne kombify weitermachen.

---

## Ready to Start?

→ [Get Started with kombify](../getting-started/FIRST_HOMELAB.md)

→ [Choose Your StackKit](../getting-started/CHOOSING_A_STACKKIT.md)

→ [Join the Community](https://discord.gg/kombify)

---

*Built with ❤️ for the Self-Hosting Community*
