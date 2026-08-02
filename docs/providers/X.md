# X OAuth2 Provider

## Provider contract

Provider key: `x`  
Display name: `X OAuth2`  
Authentication: OAuth2 user token with PKCE

## Capabilities

- OAuth
- refresh
- health check

The registered OAuth security requirements are state required, PKCE required, and nonce disabled. The default scopes are `users.read` and `offline.access`.

## Configuration

```env
X_CLIENT_ID=YOUR_X_CLIENT_ID
X_REDIRECT_URI=YOUR_X_REDIRECT_URI
X_CLIENT_SECRET=YOUR_X_CLIENT_SECRET
```

`X_CLIENT_SECRET` is optional. The client ID and redirect URI are required for OAuth; the optional secret is included in token exchange and refresh requests only when configured.

## Architecture boundary

`XProvider` delegates OAuth behavior to `XOAuthService`; `XApiClient` performs X API communication. The provider does not access storage directly. Credential persistence remains outside the provider boundary.

## Scope

This document describes the registered provider contract. Provider-specific application features and external account configuration are not part of the current provider implementation.
