# FTP Provider

## Status

Eingeführt in MS9 F7.2.

## Typ

Connection Provider.

## Zweck

Der FTP Provider verwaltet klassische FTP-Zugangsdaten für FTP-Server und stellt Validierungs- sowie Health-Check-Funktionen bereit.

## Authentifizierungsmodell

FTP verwendet klassische Benutzername-/Passwort-Anmeldung.

Nicht unterstützt:

- OAuth
- Callback
- Refresh
- Revoke
- PKCE

## Credential-Felder

Pflicht:

- host
- username
- password

Optional:

- port (Standard: 21)

## Capabilities

Unterstützt:

- VALIDATE
- HEALTH_CHECK

Nicht unterstützt:

- OAuth
- Refresh
- Callback
- PKCE

## Architektur

```text
ProviderManager
    ↓
FtpProvider
    ↓
FtpConnectionService
    ↓
FtpClient
```

Der Provider enthält ausschließlich die fachliche Providerlogik.

Der Connection Service übernimmt Verbindungsaufbau sowie Validierung.

Der FtpClient kapselt sämtliche technische FTP-Kommunikation.

## Health Check

Der Health Check prüft:

- Erreichbarkeit des Servers
- erfolgreiche Anmeldung
- ordnungsgemäßes Schließen der Verbindung

## Sicherheit

Alle Secrets werden über den bestehenden verschlüsselten CredentialStore gespeichert.

## Scope

Enthalten:

- FTP Credential Provider
- Validation
- Health Check

Nicht Bestandteil:

- Dateioperationen
- Upload
- Download
- Synchronisation
- Verzeichnisoperationen
