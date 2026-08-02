import { LegacyTokenCredentialStoreAdapter } from './legacy-token-credential-store-adapter.js';

export class CredentialStore {
  constructor({ storageAdapter = null, tokenStore = null } = {}) {
    if (storageAdapter) {
      this.storageAdapter = storageAdapter;
      return;
    }

    if (tokenStore) {
      this.storageAdapter = new LegacyTokenCredentialStoreAdapter({ tokenStore });
      return;
    }

    throw new Error('CredentialStore requires a storageAdapter');
  }

  async load(credentialId) {
    return this.storageAdapter.load(credentialId);
  }

  async save(credentialInput) {
    return this.storageAdapter.save(credentialInput);
  }

  async delete(credentialId) {
    return this.storageAdapter.delete(credentialId);
  }

  async exists(credentialId) {
    return this.storageAdapter.exists(credentialId);
  }

  async list() {
    return this.storageAdapter.list();
  }

  async listLegacyTokens() {
    if (!this.storageAdapter.listLegacyTokens) {
      throw new Error('CredentialStore.listLegacyTokens() requires a legacy token storage adapter during MS8 migration');
    }

    return this.storageAdapter.listLegacyTokens();
  }
}
