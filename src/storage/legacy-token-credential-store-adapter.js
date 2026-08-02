import { Credential } from '../models/credential.js';
import { LifecycleState } from '../models/lifecycle-state.js';
import { TokenRecord } from '../models/token-record.js';

export class LegacyTokenCredentialStoreAdapter {
  constructor({ tokenStore }) {
    if (!tokenStore) {
      throw new Error('LegacyTokenCredentialStoreAdapter requires a tokenStore during MS8 migration');
    }

    this.tokenStore = tokenStore;
  }

  async load(credentialId) {
    try {
      const tokenRecord = await this.tokenStore.load(credentialId);
      return this.#tokenRecordToCredential(tokenRecord);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        const notFound = new Error(`Credential '${credentialId}' not found`);
        notFound.code = 'NOT_FOUND';
        throw notFound;
      }

      throw error;
    }
  }

  async save(credentialInput) {
    const credential = Credential.from(credentialInput);
    return this.tokenStore.save(this.#credentialToTokenRecord(credential));
  }

  async delete(credentialId) {
    return this.tokenStore.delete(credentialId);
  }

  async exists(credentialId) {
    return this.tokenStore.exists(credentialId);
  }

  async list() {
    const tokenRecords = await this.tokenStore.list();
    return tokenRecords.map((tokenRecord) => this.#tokenRecordToCredential(tokenRecord));
  }

  async listLegacyTokens() {
    return this.tokenStore.list();
  }

  #tokenRecordToCredential(tokenRecord) {
    const token = tokenRecord instanceof TokenRecord
      ? tokenRecord
      : new TokenRecord(tokenRecord);

    const secrets = [
      { name: 'accessToken', value: token.accessToken }
    ];

    if (token.refreshToken) {
      secrets.push({ name: 'refreshToken', value: token.refreshToken });
    }

    return Credential.from({
      credentialId: token.providerId,
      credentialKey: token.credentialKey,
      providerKey: token.provider,
      credentialMethodKey: 'oauth2',
      externalReference: token.accountId,
      lifecycleState: LifecycleState.ACTIVE,
      secrets,
      metadata: {
        accountName: token.accountName,
        expiresAt: token.expiresAt,
        scopes: token.scopes,
        legacyProviderId: token.providerId,
        legacyTokenMetadata: token.metadata,
        lastRefreshAt: token.lastRefreshAt,
        lastHealthCheckAt: token.lastHealthCheckAt
      },
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
      version: token.version
    });
  }

  #credentialToTokenRecord(credential) {
    const accessToken = this.#findSecretValue(credential, 'accessToken');

    if (!accessToken) {
      throw new Error(
        'LegacyTokenCredentialStoreAdapter.save() requires an accessToken secret while delegating to TokenStore during MS8 migration'
      );
    }

    const externalReference = credential.externalReference ?? credential.credentialId;
    const providerId = credential.credentialId.includes(':')
      ? credential.credentialId
      : `${credential.providerKey}:${externalReference}`;
    const metadata = credential.metadata.toJSON();

    return new TokenRecord({
      id: credential.credentialId,
      credentialKey: credential.credentialKey,
      providerId,
      provider: credential.providerKey,
      accountId: externalReference,
      accountName: metadata.accountName ?? null,
      accessToken,
      refreshToken: this.#findSecretValue(credential, 'refreshToken'),
      expiresAt: metadata.expiresAt ?? null,
      scopes: metadata.scopes ?? [],
      metadata: metadata.legacyTokenMetadata ?? metadata,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
      lastRefreshAt: metadata.lastRefreshAt ?? null,
      lastHealthCheckAt: metadata.lastHealthCheckAt ?? null,
      version: credential.version
    });
  }

  #findSecretValue(credential, name) {
    return credential.secrets.find((secret) => secret.name === name)?.value ?? null;
  }
}
