# kombify Philosophy

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-23  
> **Audience:** All Users

---

## Our Vision

*"One spec file, unified infrastructure — from planning to production."*

kombify wurde geboren aus der Frustration, die jeder Homelab-Enthusiast kennt: dutzende Tools, endlose YAML-Dateien, komplexe Netzwerk-Konfigurationen und die ständige Angst, dass beim nächsten Update alles zusammenbricht.

Wir glauben, dass **Infrastruktur-Management einfach sein sollte** — ohne die Macht zu opfern, die erfahrene Nutzer brauchen.

---

## Unsere Grundprinzipien

### 1. 📄 Spec-Driven: Eine Wahrheit

**Das Problem:** Konfigurationen verstreut über Container-Labels, Environment-Files, Docker-Compose-Dateien und Shell-Scripts.

**Unsere Lösung:** Eine einzige `kombination.yaml` definiert dein gesamtes Homelab — deklarativ, versionierbar, teilbar.

```yaml
# Dein gesamtes Homelab in einer Datei
stackkit: modern-homelab
name: "Mein Homelab"

intent:
  purpose: photo-cloud
  users: 4
  access: family

nodes:
  - name: nuc-01
    type: local
    services: [storage, compute]
```

> **Warum das wichtig ist:** Deine Infrastruktur ist Code. Du kannst sie committen, reviewen, und jederzeit exakt reproduzieren.

---

### 2. 🧪 Simulate Before You Deploy

**Das Problem:** "Funktioniert das auf meiner Hardware?" — Diese Frage erfährst du oft erst nach Stunden manueller Einrichtung.

**Unsere Lösung:** kombify Sim erstellt leichtgewichtige "virtuelle Server" mit Docker, auf denen du dein Setup testen kannst, bevor du echte Hardware anfasst.

```bash
# Teste dein Homelab-Setup in 30 Sekunden
kombisim apply-template homelab-basic --auto-start

# SSH in deine "Server"
ssh -p 2222 root@localhost
```

> **Warum das wichtig ist:** Experimente sollten keine echten Konsequenzen haben. Lerne, teste, iteriere — ohne Risiko.

---

### 3. 🏗️ Blueprints, Not Boilerplate

**Das Problem:** Jeder Homelab-Neuling startet bei Null. Welchen Reverse Proxy? Welches Monitoring? Wie verbinde ich Cloud und Local?

**Unsere Lösung:** StackKits sind vordefinierte, validierte Blueprints für häufige Szenarien — von Experten kuratiert, von der Community verbessert.

| StackKit | Für wen | Was du bekommst |
|----------|---------|-----------------|
| **Base Homelab** | Einsteiger | Ein Server, Docker, Basis-Monitoring |
| **Modern Homelab** | Fortgeschrittene | Lokal + Cloud hybrid, Split-Services |
| **HA Homelab** | Enthusiasten | 3+ Server, Docker Swarm, Hochverfügbarkeit |

> **Warum das wichtig ist:** Du startest nicht bei Null, sondern auf den Schultern der Community.

---

### 4. 🔓 Open Core: Power to the People

**Das Problem:** Vendor Lock-in. Closed-Source-Tools, die du nicht verstehen, anpassen oder hosten kannst.

**Unsere Lösung:** Unsere Kern-Tools — kombify Stack, Sim, und StackKits — sind Open Source (MIT). Du kannst sie selbst hosten, forken, anpassen.

| Tier | Was | Lizenz |
|------|-----|--------|
| **Open Source** | Stack, Sim, StackKits | MIT / AGPL |
| **SaaS** | kombify Sphere | Proprietary |

> **Warum das wichtig ist:** Du besitzt deine Infrastruktur. Wir verdienen nur, wenn wir dir echten Mehrwert bieten.

---

### 5. 🌱 Progressive Complexity

**Das Problem:** Tools, die entweder zu simpel (keine Kontrolle) oder zu komplex (Kubernetes für 2 Server?) sind.

**Unsere Lösung:** Zwei Wege zum gleichen Ziel:

```
┌─────────────────┐              ┌─────────────────┐
│   Easy Wizard   │              │ Technical Wizard│
│                 │              │                 │
│ "Ich will       │    ODER      │ "Ich brauche    │
│  Familienfotos  │              │  Traefik mit    │
│  hosten"        │              │  Wildcard-Cert" │
└────────┬────────┘              └────────┬────────┘
         │                                │
         └────────────┬───────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │ kombination.  │
              │    yaml       │
              └───────────────┘
```

> **Warum das wichtig ist:** Anfänger sollen nicht überfordert, Experten nicht eingeschränkt werden.

---

## Was kombify NICHT ist

### Kein Kubernetes-Ersatz

kombify ist für Homelabs und Self-Hosting optimiert. Wenn du 100+ Services in der Cloud orchestrieren willst, ist Kubernetes wahrscheinlich besser geeignet.

### Keine "Magic Box"

Wir abstrahieren Komplexität, aber verstecken sie nicht. Du kannst immer unter die Haube schauen, die generierten OpenTofu-Configs inspizieren, und manuell eingreifen.

### Kein Vendor Lock-in

Du kannst jederzeit die generierten Configs exportieren und kombify komplett verlassen. Deine Infrastruktur gehört dir.

---

## Die kombify-Reise

```
        ┌──────────────────────────────────────────────────────────┐
        │                                                          │
        │   🌱 START         🧪 TEST           🚀 DEPLOY          │
        │                                                          │
        │   Wizard          Simulation        Production          │
        │   ausfüllen       mit kombify Sim   mit kombify Stack   │
        │                                                          │
        │   "Was willst     "Funktioniert     "Ein Klick,         │
        │    du bauen?"      das Setup?"       es läuft."         │
        │                                                          │
        └──────────────────────────────────────────────────────────┘
```

### Tag 1: Entdecken

Du öffnest den Easy Wizard und beantwortest ein paar Fragen:
- "Ich will meine Familienfotos selbst hosten"
- "4 Nutzer, private Zugänge"
- "Ich habe einen NUC und einen Hetzner VPS"

**Ergebnis:** Eine vollständige `kombination.yaml` für ein "Modern Homelab" mit Immich, Traefik, und geteilten Services.

### Tag 2: Testen

Du startest kombify Sim und siehst dein Setup als Docker-Container:
- SSH in den simulierten "NUC"
- Überprüfe, ob Traefik richtig routet
- Teste, ob Immich erreichbar ist

**Ergebnis:** Vertrauen, dass es auf der echten Hardware funktioniert.

### Tag 3: Deployen

Ein Klick in kombify Stack:
- OpenTofu provisioniert den VPS
- Der Agent wird auf dem NUC installiert
- Services werden deployt
- SSL-Zertifikate werden automatisch erstellt

**Ergebnis:** Dein Homelab läuft.

### Tag 30+: Weiterentwickeln

- Dashboard zeigt Gesundheit aller Services
- Alerts bei Problemen
- Ein-Klick-Updates für Services
- Neue StackKits und Add-ons ausprobieren

---

## Für wen ist kombify?

### ✅ Perfekt für dich, wenn...

- Du ein Homelab aufbauen willst, aber nicht Wochen in Einrichtung investieren möchtest
- Du Docker kennst, aber keine Lust auf Kubernetes hast
- Du Selbst-Hosting liebst, aber zuverlässige Setups willst
- Du hybrid arbeiten willst (lokal + cloud)
- Du Open Source bevorzugst, aber guten Support schätzt

### ⚠️ Vielleicht nicht ideal, wenn...

- Du Kubernetes in Produktion brauchst (wir unterstützen es nicht... noch nicht)
- Du ausschließlich in der Public Cloud arbeitest (AWS/GCP/Azure-native Tools sind dann besser)
- Du komplett GUI-frei arbeiten willst (wir sind UI-first)

---

## Mach mit!

kombify ist ein Community-Projekt. Du kannst:

- **Beitragen:** Issues, PRs, Dokumentation
- **Teilen:** Deine StackKits und Konfigurationen
- **Diskutieren:** Discord, GitHub Discussions
- **Unterstützen:** kombify Sphere Subscription

---

*Built with ❤️ for the Self-Hosting Community*
