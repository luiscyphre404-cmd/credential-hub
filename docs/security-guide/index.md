# Security Guide

## Consumer Trust Boundary

The Consumer API is the security boundary between Credential HUB and an
authenticated Consumer Runtime. This section consolidates the existing
responsibility split defined by the API Reference and the public Consumer
integration guidance. It introduces no new API or security rule.

### Credential HUB responsibility

Credential HUB is responsible for the security controls within its boundary:

- authenticating the Consumer request;
- authorizing access through the applicable Consumer Grant;
- checking that the requested Secret fields are explicitly permitted;
- checking Credential lifecycle and consumability;
- resolving only the controlled, authorized Secret selection; and
- enforcing the documented authenticated API boundary and secret-free audit
  evidence handling.

Credential HUB returns only the authorized result through the existing
Consumer API contract. Discovery and Runtime-Public projection remain subject
to their existing grant, classification and projection rules. Resolve remains
the operation for explicitly requested Secret fields.

### Consumer Runtime responsibility

After a successful Resolve, the received values are processed by the
Consumer Runtime. The Consumer Runtime is responsible for applying its own
security mechanisms to those values and for using and disposing of them in
accordance with its environment and integration.

Credential HUB does not automatically control how a Consumer Runtime handles
values after delivery, including:

- storage within the Consumer system;
- logging within the Consumer system;
- UI presentation within the Consumer system; or
- onward transmission by Consumer applications.

This boundary does not grant permission to persist, log, display or transmit
Secret values. It identifies the existing responsibility boundary after the
Consumer API has returned an authorized result. Consumer integrations must
follow their applicable security controls while preserving the existing
least-privilege and transient-use expectations of the Consumer contract.

## Declarative custom-provider onboarding

Creating a custom provider requires `providers:manage`. The onboarding API accepts a data-only schema: provider identity and display metadata, Credential Methods, public method bindings, and Credential Field schemas. It rejects OAuth settings, provider-configuration fields, credential values, executable adapters, code, hooks, scripts, and runtime-operation declarations.

Custom-provider definitions are stored separately from Credentials. A field marked `secret` describes the handling required for a future Credential value; the definition itself contains no secret value. Only the restricted declarative schema is persisted or returned through the Provider API. Public method bindings exclude runtime adapters, and public field schemas expose neither a secret value nor a secret default.

Nested schema input is allowlisted. UI-created definitions cannot store validation patterns, arbitrary defaults, options, CSV aliases, system-managed fields, or a `providerConfiguration` section. These restrictions keep the persisted metadata from changing server execution outside the declared declarative contract.
