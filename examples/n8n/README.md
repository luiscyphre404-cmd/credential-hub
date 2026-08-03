# Credential HUB n8n Examples

Diese Workflows demonstrieren den offiziellen Consumer API Ablauf von Credential HUB.

## Enthaltene Beispiele

### Consumer API Example (OpenAI)

Zeigt:

- Discovery
- Credential Selection
- Resolve
- OpenAI Request
- Sanitized Result

### OAuth Consumer Example (Twitch)

Zeigt:

- Discovery
- Runtime-Public Fields
- Resolve
- OAuth Request
- Sanitized Result

### Consumer API Template

Generischer Ausgangspunkt für eigene Integrationen.

Der Anwender muss lediglich konfigurieren:

- Credential Display Name
- Secret Names
- Public Fields

---

## Voraussetzungen

- Credential HUB läuft
- Consumer API Token vorhanden
- Credential eingerichtet
- Consumer Grant vorhanden

---

## Sicherheit

Credential HUB liefert Secrets ausschließlich über Resolve.

Die Beispiele geben niemals Secret-Werte aus.
