# Scribe Integration Guide

Scribe ist eine Browser-Extension, die automatisch Schritt-für-Schritt-Anleitungen mit Screenshots erstellt. Diese Anleitung beschreibt, wie wir Scribe intelligent mit Playwright kombinieren.

## Tool-Strategie

| Szenario | Tool | Grund |
|----------|------|-------|
| **UI-Übersichts-Screenshots** | Playwright | Automatisiert, versioniert, CI-integriert |
| **Schritt-für-Schritt-Anleitungen** | Scribe | Interaktive Flows, menschliche Aktionen |
| **API-Dokumentation** | OpenAPI/Code | Generiert aus Schema |
| **Architektur-Diagramme** | Mermaid | Code-basiert, versioniert |

## Scribe Setup

### 1. Installation

1. Installiere [Scribe Chrome Extension](https://scribehow.com/)
2. Erstelle ein Scribe-Konto (Free Tier: 5 Scribes/Monat)
3. Aktiviere die Browser-Extension

### 2. Aufnahme-Workflow

Für neue Tutorials:

1. **Klicke auf Scribe-Icon** in der Browser-Leiste
2. **Starte Aufnahme** (Blauer Button)
3. **Führe die Aktion durch** (z.B. "Erstelle einen neuen Stack")
4. **Stoppe Aufnahme** (Roter Button)
5. **Exportiere als Markdown**:
   - Klicke "Share" → "Export" → "Markdown"
   - Speichere unter `internal-notes/scribe-exports/[name].md`

### 3. Scribe-Export zu Mintlify konvertieren

Nach dem Export muss der Scribe-Markdown in Mintlify-MDX konvertiert werden:

```bash
# Konvertiere Scribe-Export zu Mintlify-MDX
node scripts/scribe-to-mdx.js internal-notes/scribe-exports/create-stack.md guides/tutorials/create-stack.mdx
```

## Scribe-Namenskonventionen

| Prefix | Verwendung | Beispiel |
|--------|------------|----------|
| `guide-` | Schritt-für-Schritt-Anleitungen | `guide-create-first-stack.md` |
| `howto-` | Kurze How-To's | `howto-add-service.md` |
| `troubleshoot-` | Fehlerbehebung | `troubleshoot-agent-connection.md` |
| `setup-` | Einrichtungsanleitungen | `setup-auth-sso.md` |

## Wann Playwright vs. Scribe verwenden

### ✅ Playwright verwenden wenn:

- Screenshot zeigt **statischen UI-Zustand** (Dashboard, Übersicht)
- Screenshot muss bei **jedem Release** aktualisiert werden
- Screenshot wird in **mehreren Docs-Seiten** verwendet
- Screenshot zeigt **öffentliche Seiten** (kein Login nötig)

### ✅ Scribe verwenden wenn:

- Dokumentation zeigt **mehrstufige User-Flows**
- Jeder Schritt braucht **eigenen Screenshot**
- Flow enthält **Formular-Eingaben** oder **Klick-Sequenzen**
- Tutorial wird **selten aktualisiert** (< 1x pro Monat)

## Kombinierter Workflow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   UI-Change     │────▶│  Playwright CI   │────▶│ Auto-Screenshots│
│   (PR Merged)   │     │  (GitHub Action) │     │ in /images/     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  New Tutorial   │────▶│  Scribe Record   │────▶│ Konvertierung   │
│  (Manual)       │     │  (Browser Ext.)  │     │ scribe-to-mdx   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Scribe Best Practices

1. **Vor der Aufnahme**:
   - Browser-Zoom auf 100% setzen
   - Fenster auf 1280x720 skalieren
   - Dark Mode aktivieren (passt zu Docs)
   - Testdaten vorbereiten

2. **Während der Aufnahme**:
   - Langsam und präzise klicken
   - Formulare vollständig ausfüllen
   - Bei Fehlern: Stoppen, neu starten (nicht editieren)

3. **Nach der Aufnahme**:
   - Titel und Beschreibung in Scribe editieren
   - Sensible Daten (Passwörter, API-Keys) zensieren
   - Als Markdown exportieren

## Scribe-zu-MDX Konverter

Das Script `scribe-to-mdx.js` konvertiert Scribe-Exporte automatisch:

- Wandelt Scribe-Markdown zu Mintlify-MDX
- Lädt Screenshots in `/images/tutorials/` hoch
- Generiert `<Steps>` Komponenten
- Fügt Frontmatter hinzu
