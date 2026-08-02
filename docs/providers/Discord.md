# Discord OAuth2 Provider

## Zweck

Der Discord Provider verwaltet Discord OAuth2 User Credentials für Community-, Bot-nahe und Streaming-Automatisierungen.

Nicht Bestandteil dieses Providers sind Discord Bot Tokens, Gateway/WebSocket-Verbindungen, Slash Commands oder Guild-/Rollenverwaltung.

## Konfiguration

Der Provider benötigt folgende Umgebungsvariablen:

```env
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=
```

Die Redirect URI muss im Discord Developer Portal für die Anwendung hinterlegt sein.

## OAuth-Endpunkte

- Authorization: `https://discord.com/oauth2/authorize`
- Token: `https://discord.com/api/oauth2/token`
- UserInfo: `https://discord.com/api/users/@me`

## Default Scopes

```text
identify email guilds
```

## Security Requirements

```json
{
  "state": "required",
  "pkce": "disabled",
  "nonce": "disabled"
}
```

Der OAuth-State wird generisch über den `OAuthSecurityService` erzeugt und validiert.

## CLI

```bash
node src/cli/run-oauth.js discord
```

## HTTP

```text
GET /oauth/discord/login
GET /oauth/discord/callback
```

## Architekturgrenzen

- `DiscordProvider` enthält nur Provider-Delegation und fachliche Provider-Validierung.
- `DiscordOAuthService` enthält Discord-spezifischen OAuth-Flow.
- `DiscordApiClient` enthält ausschließlich HTTP-Kommunikation mit Discord.
- Credential-Speicherung erfolgt weiterhin über `CredentialManager`, `CredentialStore` und `EncryptedJsonStore`.
