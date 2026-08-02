export class TokenManager {
  constructor({ credentialManager }) {
    if (!credentialManager) {
      throw new Error('TokenManager requires a credentialManager');
    }

    this.credentialManager = credentialManager;
  }

  async register(tokenInput) {
    return this.credentialManager.register(this.#toCredentialInput(tokenInput));
  }

  async load(tokenId) {
    return this.credentialManager.load(tokenId);
  }

  async validate(tokenOrId) {
    return this.credentialManager.validate(tokenOrId);
  }

  async refresh(tokenOrId) {
    return this.credentialManager.refresh(tokenOrId);
  }

  async revoke(tokenOrId) {
    return this.credentialManager.revoke(tokenOrId);
  }

  async delete(tokenOrId) {
    return this.credentialManager.delete(tokenOrId);
  }

  #toCredentialInput(tokenInput) {
    if (tokenInput?.credentialId && tokenInput?.providerKey) {
      return tokenInput;
    }

    return {
      credentialId: tokenInput?.id,
      providerKey: tokenInput?.providerKey ?? tokenInput?.provider ?? tokenInput?.providerId,
      externalReference: tokenInput?.externalReference ?? tokenInput?.accountId ?? null,
      lifecycleState: tokenInput?.lifecycleState,
      secrets: tokenInput?.secrets ?? this.#tokenSecrets(tokenInput),
      metadata: tokenInput?.metadata ?? {},
      createdAt: tokenInput?.createdAt,
      updatedAt: tokenInput?.updatedAt,
      version: tokenInput?.version ?? 1
    };
  }

  #tokenSecrets(tokenInput = {}) {
    const secrets = [];

    if (tokenInput.accessToken) {
      secrets.push({ name: 'accessToken', value: tokenInput.accessToken });
    }

    if (tokenInput.refreshToken) {
      secrets.push({ name: 'refreshToken', value: tokenInput.refreshToken });
    }

    return secrets;
  }
}
