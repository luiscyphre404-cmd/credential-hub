export class OAuthResult {
  constructor({
    providerId,
    provider,
    accountId,
    accountName = null,

    accessToken,
    refreshToken = null,

    expiresAt = null,
    scopes = [],

    metadata = {}
  }) {
    if (!providerId) {
      throw new Error("OAuthResult: 'providerId' is required");
    }

    if (!provider) {
      throw new Error("OAuthResult: 'provider' is required");
    }

    if (!accountId) {
      throw new Error("OAuthResult: 'accountId' is required");
    }

    if (!accessToken) {
      throw new Error("OAuthResult: 'accessToken' is required");
    }

    this.providerId = providerId;
    this.provider = provider;
    this.accountId = accountId;
    this.accountName = accountName;

    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    this.expiresAt = expiresAt;
    this.scopes = [...scopes];
    this.metadata = { ...metadata };

    Object.freeze(this.scopes);
    Object.freeze(this.metadata);
    Object.freeze(this);
  }
}
