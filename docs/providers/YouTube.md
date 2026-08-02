# YouTube

## Status

Review abgeschlossen in MS9 F7.5.

## Entscheidung

YouTube wird nicht als eigener OAuth-Provider umgesetzt.

YouTube nutzt Google OAuth. Die spätere Unterstützung erfolgt über den bestehenden GoogleProvider, z. B. als Capability oder Profil mit YouTube-spezifischen Scopes und API-Zugriffen.

## Begründung

- gleicher Google OAuth Flow
- gleiche Google Client-ID / Client Secret
- gleiche Token- und Refresh-Mechanik
- Unterschiede liegen in Scopes und YouTube API-Endpunkten

## Spätere Umsetzung

Möglicher Ausbau über AB-009 Provider Profiles:

```text
GoogleProvider
  ├── Google Account
  └── YouTube
```
