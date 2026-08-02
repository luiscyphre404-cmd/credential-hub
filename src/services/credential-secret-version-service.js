import { Credential } from '../models/credential.js';
import { CredentialSecretVersion } from '../models/credential-secret-version.js';

export class CredentialSecretVersionService {
  constructor({
    store = null,
    credentialManager = null,
    credentialManagerRef = null,
    auditLogService = null,
    clock = () => new Date()
  } = {}) {
    this.store = store;
    this.credentialManager = credentialManager;
    this.credentialManagerRef = credentialManagerRef;
    this.auditLogService = auditLogService;
    this.clock = clock;
    this.records = [];
  }

  async recordCredentialVersion(credentialInput, { reason = 'manual-update', createdBy = 'system', metadata = {} } = {}) {
    const credential = Credential.from(credentialInput);
    const versions = await this.#loadVersions();
    const nextVersion = this.#nextVersion(versions, credential.credentialId);
    const record = new CredentialSecretVersion({
      credentialId: credential.credentialId,
      version: nextVersion,
      secrets: credential.secrets.map((secret) => secret.toJSON()),
      reason,
      createdAt: this.clock(),
      createdBy,
      metadata: {
        providerKey: credential.providerKey,
        credentialVersion: credential.version,
        ...metadata
      }
    });

    versions.push(record.toJSON());
    await this.#saveVersions(versions);
    await this.#recordAudit('credential-secret-version.created', credential.credentialId, 'success', {
      version: record.version,
      reason: record.reason,
      providerKey: credential.providerKey
    });

    return record;
  }

  async listCredentialVersions(credentialId) {
    this.#assertCredentialId(credentialId, 'listCredentialVersions');
    const versions = await this.#loadVersions();
    return versions
      .filter((record) => record.credentialId === credentialId)
      .sort((left, right) => right.version - left.version)
      .map((record) => CredentialSecretVersion.from(record));
  }

  async getCredentialVersion(credentialId, version) {
    this.#assertCredentialId(credentialId, 'getCredentialVersion');
    const normalizedVersion = this.#normalizeVersion(version);
    const versions = await this.#loadVersions();
    const record = versions.find((item) => item.credentialId === credentialId && item.version === normalizedVersion);

    if (!record) {
      const error = new Error(`Secret version ${normalizedVersion} for credential '${credentialId}' not found`);
      error.code = 'NOT_FOUND';
      throw error;
    }

    return CredentialSecretVersion.from(record);
  }

  async rollbackCredentialSecrets(credentialId, version, context = {}) {
    this.#assertCredentialId(credentialId, 'rollbackCredentialSecrets');
    const credentialManager = this.#credentialManager();

    const targetVersion = await this.getCredentialVersion(credentialId, version);
    const currentCredential = await credentialManager.getCredential(credentialId);
    const rolledBackCredential = await credentialManager.updateCredential(credentialId, {
      secrets: targetVersion.secrets.map((secret) => ({ ...secret })),
      metadata: {
        ...currentCredential.metadata.toJSON(),
        custom: {
          ...(currentCredential.metadata.toJSON().custom ?? {}),
          lastSecretRollbackAt: this.#timestamp(this.clock()),
          lastSecretRollbackVersion: targetVersion.version
        }
      }
    }, {
      versionReason: 'rollback',
      createdBy: context.userId ?? 'system',
      skipSecretVersionRecord: true
    });

    await this.recordCredentialVersion(rolledBackCredential, {
      reason: 'rollback',
      createdBy: context.userId ?? 'system',
      metadata: { restoredFromVersion: targetVersion.version }
    });
    await this.#recordAudit('credential-secret-version.rolled-back', credentialId, 'success', {
      restoredFromVersion: targetVersion.version
    });

    return rolledBackCredential;
  }

  #credentialManager() {
    const manager = this.credentialManager ?? this.credentialManagerRef?.();

    if (!manager?.getCredential || !manager?.updateCredential) {
      throw new Error('CredentialSecretVersionService.rollbackCredentialSecrets() requires credentialManager');
    }

    return manager;
  }

  async #loadVersions() {
    if (!this.store?.load) {
      return this.records.map((record) => ({ ...record, secrets: record.secrets.map((secret) => ({ ...secret })) }));
    }

    try {
      const data = await this.store.load();
      return Array.isArray(data?.versions) ? data.versions.map((record) => ({ ...record, secrets: record.secrets.map((secret) => ({ ...secret })) })) : [];
    } catch (error) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
  }

  async #saveVersions(versions) {
    const records = versions.map((record) => ({ ...record, secrets: record.secrets.map((secret) => ({ ...secret })) }));

    if (!this.store?.save) {
      this.records = records;
      return;
    }

    await this.store.save({ versions: records });
  }

  #nextVersion(versions, credentialId) {
    const current = versions
      .filter((record) => record.credentialId === credentialId)
      .reduce((highest, record) => Math.max(highest, record.version ?? 0), 0);
    return current + 1;
  }

  async #recordAudit(action, credentialId, result, details) {
    if (!this.auditLogService?.record) return;

    await this.auditLogService.record({
      action,
      targetType: 'credential',
      targetId: credentialId,
      result,
      details
    });
  }

  #assertCredentialId(credentialId, operation) {
    if (!credentialId) {
      throw new Error(`CredentialSecretVersionService.${operation}() requires credentialId`);
    }
  }

  #normalizeVersion(version) {
    const normalized = Number(version);
    if (!Number.isInteger(normalized) || normalized < 1) {
      throw new Error('Secret version must be a positive integer');
    }
    return normalized;
  }

  #timestamp(value) {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString();
  }
}
