# Installation Guide

## Prerequisites

For local development, use a supported Node.js runtime and install the repository dependencies from the lockfile:

```bash
npm ci
```

For the Public Beta Docker path, install Docker Desktop or Docker Engine with the Compose plugin instead.

## Configuration

Create a local environment file from the public template before starting Compose:

```bash
cp .env.example .env
```

The template contains safe development defaults. Replace `TOKEN_ENCRYPTION_KEY` with a unique 32-character secret before storing real credentials, and never commit `.env`. Follow the [Configuration Reference](../configuration-reference/index.md) for encryption, OAuth, scheduler, and callback settings.

If declarative custom providers are required, validate `CUSTOM_PROVIDER_DEFINITIONS` as JSON before startup. Invalid custom-provider definitions stop registration and must be corrected before the application can start.

## Local start and validation

```bash
npm run check
npm test
node src/index.js
```

## Docker start

Start a fresh clone with the canonical command:

```bash
docker compose up --build
```

The Compose configuration is self-contained: it builds the explicit `credential-hub:1.0.0-beta.1` image tag from the current package version, creates its own network, and uses repository-relative persistent directories. It does not require a pre-existing Docker network or local user paths. Stop the foreground process with `Ctrl+C`; use `docker compose down` to remove the container and network.

For a new release, update the canonical package version and the Compose image/build argument together, then verify the rendered Compose configuration before deployment:

```bash
docker compose config
```

The HTTP callback and REST server uses `OAUTH_CALLBACK_PORT`, defaulting to `3000`. With the default `BASE_PATH=/`, verify the local health endpoint with `GET /health`.

## Base path and reverse proxy deployment

For a deployment below a path prefix, configure the application before starting it:

```env
BASE_PATH=<YOUR_BASE_PATH>
PUBLIC_BASE_URL=<YOUR_PUBLIC_ORIGIN>
```

For example, set `BASE_PATH=/credential-hub` and set `PUBLIC_BASE_URL` to the external origin such as `https://credential-hub.example.com`.

`PUBLIC_BASE_URL` must be the external HTTP(S) origin without a path, query, or fragment. It prevents an internal proxy host or protocol from becoming part of an OAuth redirect URI. The application then serves the Admin UI at `/credential-hub/admin/`, health at `/credential-hub/health`, and the REST and OAuth routes below `/credential-hub/`. Configure every OAuth provider with the exact redirect URI shown in the Wizard; it includes the same prefix.

The reverse proxy must preserve the request path. The following neutral examples forward a local service without stripping `/credential-hub`.

### Nginx

```nginx
location /credential-hub/ {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Caddy

```caddy
credential-hub.example.com {
    reverse_proxy /credential-hub/* localhost:3000
}
```

### Traefik

Route the service with a `PathPrefix(`/credential-hub`)` rule and do not add a strip-prefix middleware.

### Apache HTTP Server

```apache
ProxyPass        /credential-hub/ http://localhost:3000/credential-hub/
ProxyPassReverse /credential-hub/ http://localhost:3000/credential-hub/
```

Verify the prefixed health endpoint through the public proxy before registering OAuth callbacks:

```text
GET /credential-hub/health
```

## Scope boundary

Certificates, domains, host paths, container images, and platform-specific service management remain deployment decisions. The examples above define only the path-preservation requirement; historical deployment and infrastructure notes are not current installation instructions.
