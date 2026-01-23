# Your First Homelab with kombify

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-23  
> **Time Required:** ~30 minutes
> **Difficulty:** Beginner

---

## Was du bauen wirst

In diesem Guide erstellst du ein einfaches, aber vollständiges Homelab:

```
┌─────────────────────────────────────────────────────┐
│                 Dein erstes Homelab                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌──────────────┐                                  │
│   │  Dein Server │                                  │
│   │              │                                  │
│   │  • Traefik   │  ← Reverse Proxy + SSL          │
│   │  • Uptime    │  ← Monitoring                    │
│   │  • Immich    │  ← Foto-Management              │
│   │              │                                  │
│   └──────────────┘                                  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Was du danach hast:**
- ✅ Einen funktionierenden Server mit 3 Services
- ✅ HTTPS mit automatischen Zertifikaten
- ✅ Monitoring deiner Dienste
- ✅ Familienfotos selbst gehostet

---

## Voraussetzungen

### Hardware

Du brauchst **einen** der folgenden:
- Einen alten PC oder Laptop
- Einen Intel NUC oder ähnlichen Mini-PC
- Einen VPS bei Hetzner, DigitalOcean, etc.
- Einen Raspberry Pi 4 mit 4GB+ RAM

**Minimum Specs:**
- 2 CPU-Kerne
- 4 GB RAM
- 50 GB Speicher

### Software

- Ein aktuelles Linux (Ubuntu 22.04+ empfohlen)
- Docker installiert
- SSH-Zugang zu deinem Server

### Optional

- Eine eigene Domain (für öffentlichen Zugriff)
- Ein Cloudflare-Account (für Tunnel ohne offene Ports)

---

## Methode wählen

### Option A: kombify Sphere (SaaS) ⭐ Empfohlen

Die einfachste Methode — alles im Browser.

1. Gehe zu [app.kombisphere.io](https://app.kombisphere.io)
2. Erstelle einen kostenlosen Account
3. Folge dem Wizard

### Option B: Self-Hosted

Du hostest kombify Stack selbst.

```bash
# Auf deinem Server
curl -O https://raw.githubusercontent.com/soulcreek/KombiStack/main/docker-compose.yml
docker compose up -d

# Öffne http://dein-server:5260
```

### Option C: CLI-Only

Für Terminal-Fans.

```bash
# Install CLI
curl -sSL https://install.kombify.io | bash

# Start wizard
kombistack init --wizard
```

---

## Schritt 1: Server vorbereiten

### SSH-Zugang sicherstellen

```bash
# Von deinem Laptop
ssh user@dein-server-ip

# Falls noch nicht installiert
sudo apt update && sudo apt install openssh-server -y
```

### Docker installieren

```bash
# Docker installieren (falls nicht vorhanden)
curl -fsSL https://get.docker.com | sh

# User zur Docker-Gruppe hinzufügen
sudo usermod -aG docker $USER

# Ausloggen und neu einloggen
exit
ssh user@dein-server-ip

# Testen
docker run hello-world
```

---

## Schritt 2: kombify installieren

### Mit Docker Compose (Empfohlen)

```bash
# Arbeitsverzeichnis erstellen
mkdir ~/kombify && cd ~/kombify

# Docker Compose herunterladen
curl -O https://raw.githubusercontent.com/soulcreek/KombiStack/main/docker-compose.yml

# Starten
docker compose up -d

# Status prüfen
docker compose ps
```

Du solltest sehen:
```
NAME                IMAGE                                   STATUS
kombistack          ghcr.io/soulcreek/kombistack:latest    running
kombistack-ui       ghcr.io/soulcreek/kombistack-ui:latest running
```

### Web UI öffnen

Öffne im Browser: `http://dein-server-ip:5260`

Du siehst das kombify Dashboard! 🎉

---

## Schritt 3: Dein erstes Setup konfigurieren

### Easy Wizard starten

1. Klicke auf **"New Homelab"**
2. Wähle **"Easy Wizard"** (nicht "Expert Mode")

### Fragen beantworten

Der Wizard fragt dich:

**1. Was möchtest du bauen?**
→ Wähle: "Photo Cloud"

**2. Wie viele Nutzer?**
→ Wähle: "4 (Familie)"

**3. Wo soll es laufen?**
→ Wähle: "Lokaler Server"

**4. Hast du eine Domain?**
→ Wähle: "Nein (nur lokaler Zugriff)" oder "Ja" mit deiner Domain

**5. Server-Ressourcen?**
→ Wähle: "Standard (4-8 GB RAM)"

### Generierte Konfiguration

Der Wizard erstellt automatisch:

```yaml
# kombination.yaml
stackkit: base-homelab
version: "1.0.0"

meta:
  name: "My Photo Cloud"
  created: "2026-01-23"

intent:
  purpose: photo-cloud
  users: 4
  access: local  # oder "public" mit Domain

nodes:
  - name: main-server
    type: local
    connection:
      host: localhost

services:
  traefik:
    enabled: true
    dashboard: true
    
  uptime-kuma:
    enabled: true
    
  immich:
    enabled: true
    storage: 100GB
```

Klicke **"Review"**, um die Konfiguration zu sehen.

---

## Schritt 4: Simulieren (Optional aber empfohlen)

### Simulation starten

Bevor du auf echte Hardware deployst, teste in der Simulation:

1. Klicke **"Simulate"**
2. Warte, bis die Container gestartet sind (~30 Sekunden)
3. Du siehst ein virtuelles Dashboard deines Homelabs

### Was du testen kannst

- Ist Traefik erreichbar? → `http://localhost:8080`
- Läuft Immich? → `http://localhost:2283`
- Monitoring aktiv? → `http://localhost:3001`

### SSH in die Simulation

```bash
# SSH in den simulierten Server
ssh -p 2222 root@localhost
# Password: kombisim

# Docker Status prüfen
docker ps
```

Wenn alles läuft: **"Stop Simulation"** und weiter zum Deploy.

---

## Schritt 5: Deployen

### Agent auf dem Server installieren

kombify Stack muss einen Agent auf deinem Server installieren:

1. Klicke **"Deploy"**
2. Kopiere den Befehl:

```bash
curl -sSL https://install.kombify.io/agent | sudo sh -s -- \
  --token YOUR_UNIQUE_TOKEN \
  --server http://kombistack:5260
```

3. Führe ihn auf deinem Server aus
4. Warte auf "Agent Connected" im Dashboard

### Deployment starten

1. Klicke **"Apply"**
2. Du siehst den Fortschritt in Echtzeit:

```
✅ Validating configuration...
✅ Connecting to node: main-server
✅ Installing Docker services...
   ├─ traefik: running
   ├─ uptime-kuma: running
   └─ immich: running
✅ Configuring network...
✅ Deployment complete!
```

---

## Schritt 6: Dein Homelab nutzen

### Services erreichen

| Service | URL | Was es macht |
|---------|-----|--------------|
| **Traefik Dashboard** | `http://dein-server:8080` | Reverse Proxy Status |
| **Uptime Kuma** | `http://dein-server:3001` | Service Monitoring |
| **Immich** | `http://dein-server:2283` | Foto-Management |

### Immich einrichten

1. Öffne `http://dein-server:2283`
2. Erstelle einen Admin-Account
3. Lade die Immich-App auf dein Handy
4. Verbinde mit deinem Server

**Fertig!** 📸 Deine Fotos werden jetzt automatisch gesichert.

---

## Nächste Schritte

### Domain hinzufügen

Wenn du eine Domain hast, kannst du sie nachträglich hinzufügen:

```yaml
# In kombination.yaml ergänzen
network:
  domain: photos.deinedomain.de
  ssl:
    provider: letsencrypt
    email: deine@email.de
```

Dann: `kombistack apply`

### Weitere Services hinzufügen

```yaml
# Mehr Services aktivieren
services:
  jellyfin:
    enabled: true
    storage: 500GB
    
  home-assistant:
    enabled: true
```

### Backup einrichten

```yaml
backup:
  enabled: true
  schedule: "0 3 * * *"  # Täglich um 3 Uhr
  destination: s3://dein-bucket
```

---

## Troubleshooting

### "Agent nicht verbunden"

```bash
# Auf dem Server: Agent-Status prüfen
sudo systemctl status kombify-agent

# Logs ansehen
sudo journalctl -u kombify-agent -f
```

### "Container startet nicht"

```bash
# Container-Logs prüfen
docker logs traefik
docker logs immich

# Ports prüfen
sudo netstat -tlnp | grep -E "80|443|2283"
```

### "Kein Zugriff von außen"

- Firewall-Regeln prüfen: `sudo ufw status`
- Router-Port-Forwarding konfigurieren
- Oder: Cloudflare Tunnel nutzen (kein Port-Forwarding nötig)

---

## Was du gelernt hast

✅ kombify Stack installiert und konfiguriert  
✅ Ein Homelab mit dem Easy Wizard erstellt  
✅ Konfiguration in der Simulation getestet  
✅ Auf echte Hardware deployt  
✅ Immich für Foto-Backup eingerichtet  

---

## Weiter lernen

→ [Choosing a StackKit](./CHOOSING_A_STACKKIT.md) — Andere Blueprints entdecken

→ [Adding a Cloud VPS](./ADDING_CLOUD_VPS.md) — Hybrid-Setup aufbauen

→ [Expert Mode](./EXPERT_MODE.md) — Fortgeschrittene Konfiguration

---

*Built with ❤️ for the Self-Hosting Community*
