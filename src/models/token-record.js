import crypto from 'node:crypto';

export class TokenRecord {
  constructor(input = {}) {
    const {
    id = crypto.randomUUID(),

    providerId,
    provider,
    accountId,
    accountName = null,

    accessToken,
    refreshToken = null,

    expiresAt = null,
    scopes = [],

    metadata = {},

    createdAt = new Date(),
    updatedAt = new Date(),
    lastRefreshAt = null,
    lastHealthCheckAt = null,

    version = 1
    } = input;
    const credentialKey = Object.hasOwn(input, 'credentialKey')
      ? input.credentialKey
      : crypto.randomUUID();

    if (!id) {
      throw new Error("TokenRecord: 'id' is required");
    }

    if (typeof credentialKey !== 'string' || credentialKey.trim() === '') {
      throw new Error("TokenRecord: 'credentialKey' is required");
    }

    if (!providerId) {
      throw new Error("TokenRecord: 'providerId' is required");
    }

    if (!provider) {
      throw new Error("TokenRecord: 'provider' is required");
    }

    if (!accountId) {
      throw new Error("TokenRecord: 'accountId' is required");
    }

    if (!accessToken) {
      throw new Error("TokenRecord: 'accessToken' is required");
    }

    this.id = id;
    this.credentialKey = credentialKey;

    this.providerId = providerId;
    this.provider = provider;
    this.accountId = accountId;
    this.accountName = accountName;

    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    this.expiresAt = expiresAt;
    this.scopes = [...scopes];
    this.metadata = { ...metadata };

    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.lastRefreshAt = lastRefreshAt;
    this.lastHealthCheckAt = lastHealthCheckAt;

    this.version = version;

    Object.freeze(this.scopes);
    Object.freeze(this.metadata);
    Object.freeze(this);
  }
}
