# Provider Documentation

## Purpose

This directory contains the canonical provider documentation for the Credential Hub.

Each provider has exactly one canonical documentation file.

---

# Provider Categories

## OAuth Providers

- Google
- Twitch
- Kick
- Discord
- X
- Facebook
- Instagram
- Threads

## Connection Providers

- FTP
- SFTP

## API-Key Providers

- OpenAI

---

# Provider Documentation

| Provider | Type | Registered capabilities | Connection-test availability | Documentation |
|----------|------|-------------------------|------------------------------|---------------|
| Discord | OAuth2 | OAuth, refresh, health check | No draft test; authorize through OAuth | Discord.md |
| Facebook | OAuth2 | OAuth, refresh, health check | No draft test; authorize through OAuth | Facebook.md |
| FTP | Connection | validation, health check | UI available; standard image has no production transport adapter | FTP.md |
| Google | OAuth2 | OAuth, refresh, health check | No draft test; authorize through OAuth | Google.md |
| Instagram | OAuth2 | OAuth, refresh, health check | No draft test; authorize through OAuth | Instagram.md |
| Kick | OAuth2.1 | OAuth, refresh, health check | No draft test; authorize through OAuth | Kick.md |
| OpenAI | API key | validation, health check | Available through the active HTTP client | OpenAI.md |
| SFTP | Connection | validation, health check | UI available; standard image has no production transport adapter | SFTP.md |
| Threads | OAuth | OAuth, refresh, health check | No draft test; authorize through OAuth | Threads.md |
| Twitch | OAuth2 | OAuth, refresh, health check | No draft test; authorize through OAuth | Twitch.md |
| X | OAuth2 | OAuth, refresh, health check | No draft test; authorize through OAuth | X.md |
| YouTube | Not registered | None | Not available | YouTube.md (future Google capability) |

`validation` enables the Credential HUB test control; it does not by itself promise that every deployment contains a live provider transport. The active Release-1.0 standard image includes the OpenAI HTTP path. FTP and SFTP retain their provider, target-policy, timeout, and cleanup contracts but require a separately implemented and reviewed transport adapter before a production connection can be promised. The security and request/response boundaries are defined in the [Security Guide](../security-guide/index.md) and [API Reference](../api-reference/index.md#draft-connection-test).

---

# Architecture Decisions

The following provider decisions are part of the current architecture:

- YouTube is not registered as a standalone provider. Future YouTube functionality will be integrated as Google capabilities.
- Facebook, Instagram and Threads remain independent business providers within the Meta provider family.

---

# Provider Documentation Standard

Each provider document describes:

- Purpose
- Authentication model
- Credential fields
- Capabilities
- Architecture
- Validation
- Health Check
- Security
- Implementation scope

---

# Related Documentation

- [Configuration Reference](../configuration-reference/index.md)
- [API Reference](../api-reference/index.md)
