import path from 'path';
import { TokenRecord } from '../models/token-record.js';

export class BackupStore {
  constructor({ jsonStore, basePath }) {
    this.jsonStore = jsonStore;
    this.basePath = basePath;
  }

  async createBackup(tokenRecord) {
    if (!(tokenRecord instanceof TokenRecord)) {
      throw new Error('BackupStore.createBackup() requires a TokenRecord');
    }

    const backupId = this.#createBackupId();

    await this.jsonStore.save(
      this.#filePath(tokenRecord.providerId, backupId),
      this.#serialize(tokenRecord)
    );

    return backupId;
  }

  async restore(providerId, backupId, { existingCredentialKey } = {}) {
    const data = await this.jsonStore.load(this.#filePath(providerId, backupId));
    const migratedData = Object.hasOwn(data, 'credentialKey')
      ? data
      : { ...data, ...(existingCredentialKey === undefined ? {} : { credentialKey: existingCredentialKey }) };
    return new TokenRecord(migratedData);
  }

  async listBackups(providerId) {
    const directory = this.#directoryPath(providerId);

    if (!(await this.jsonStore.exists(directory))) {
      return [];
    }

    const fs = await import('fs/promises');
    const entries = await fs.readdir(directory);

    return entries
      .filter(entry => entry.endsWith('.json'))
      .map(entry => entry.replace(/\.json$/, ''))
      .sort();
  }

  async deleteBackup(providerId, backupId) {
    return this.jsonStore.delete(this.#filePath(providerId, backupId));
  }

  #filePath(providerId, backupId) {
    return path.join(this.#directoryPath(providerId), `${backupId}.json`);
  }

  #directoryPath(providerId) {
    const { provider, account } = this.#parseProviderId(providerId);
    return path.join(this.basePath, 'backups', provider, account);
  }

  #parseProviderId(providerId) {
    const [provider, account] = String(providerId).split(':');

    if (!provider || !account) {
      throw new Error(
        `Invalid providerId '${providerId}'. Expected format: provider:account`
      );
    }

    return { provider, account };
  }

  #createBackupId() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  #serialize(tokenRecord) {
    return {
      id: tokenRecord.id,
      credentialKey: tokenRecord.credentialKey,
      providerId: tokenRecord.providerId,
      provider: tokenRecord.provider,
      accountId: tokenRecord.accountId,
      accountName: tokenRecord.accountName,
      accessToken: tokenRecord.accessToken,
      refreshToken: tokenRecord.refreshToken,
      expiresAt: tokenRecord.expiresAt,
      scopes: tokenRecord.scopes,
      metadata: tokenRecord.metadata,
      createdAt: tokenRecord.createdAt,
      updatedAt: tokenRecord.updatedAt,
      lastRefreshAt: tokenRecord.lastRefreshAt,
      lastHealthCheckAt: tokenRecord.lastHealthCheckAt,
      version: tokenRecord.version
    };
  }
}
