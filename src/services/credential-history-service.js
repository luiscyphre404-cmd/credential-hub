import { CredentialHistoryEntry } from '../models/credential-history-entry.js';

export class CredentialHistoryService {
  constructor({
    credentialManager = null,
    auditLogService = null,
    secretVersioningService = null,
    clock = () => new Date()
  } = {}) {
    this.credentialManager = credentialManager;
    this.auditLogService = auditLogService;
    this.secretVersioningService = secretVersioningService;
    this.clock = clock;
  }

  async listCredentialHistory(credentialId, options = {}) {
    this.#assertCredentialId(credentialId, 'listCredentialHistory');

    const includeAudit = options.includeAudit !== false;
    const includeSecretVersions = options.includeSecretVersions !== false;
    const entries = [];

    if (includeAudit && this.auditLogService?.list) {
      const auditEntries = await this.auditLogService.list({
        targetType: 'credential',
        targetId: credentialId,
        from: options.from,
        to: options.to,
        result: options.result
      });
      entries.push(...auditEntries.map((entry) => this.#fromAuditEntry(entry)));
    }

    if (includeSecretVersions && this.secretVersioningService?.listCredentialVersions) {
      const versions = await this.secretVersioningService.listCredentialVersions(credentialId);
      entries.push(...versions.map((version) => this.#fromSecretVersion(version)));
    }

    return this.#filterAndSort(entries, options).map((entry) => entry.toJSON());
  }

  async summarizeCredentialHistory(credentialId, options = {}) {
    const entries = await this.listCredentialHistory(credentialId, options);
    const countsBySource = this.#countBy(entries, 'source');
    const countsByResult = this.#countBy(entries, 'result');

    return {
      credentialId,
      total: entries.length,
      firstEventAt: entries.length ? entries[entries.length - 1].timestamp : null,
      lastEventAt: entries.length ? entries[0].timestamp : null,
      countsBySource,
      countsByResult,
      entries: options.includeEntries === false ? [] : entries
    };
  }

  #fromAuditEntry(entry) {
    return new CredentialHistoryEntry({
      historyId: `audit:${entry.entryId}`,
      credentialId: entry.targetId,
      timestamp: entry.timestamp,
      source: 'audit-log',
      action: entry.action,
      result: entry.result,
      actor: entry.userId ?? 'system',
      summary: this.#auditSummary(entry),
      details: {
        entryId: entry.entryId,
        roleKey: entry.roleKey,
        ...this.#clone(entry.details)
      }
    });
  }

  #fromSecretVersion(versionInput) {
    const version = typeof versionInput?.toJSON === 'function' ? versionInput.toJSON() : versionInput;
    return new CredentialHistoryEntry({
      historyId: `secret-version:${version.versionId}`,
      credentialId: version.credentialId,
      timestamp: version.createdAt,
      source: 'secret-version',
      action: `secret-version.${version.reason}`,
      result: 'success',
      actor: version.createdBy ?? 'system',
      summary: `Secret version ${version.version} recorded (${version.reason})`,
      details: {
        versionId: version.versionId,
        version: version.version,
        reason: version.reason,
        metadata: this.#clone(version.metadata)
      }
    });
  }

  #filterAndSort(entries, options = {}) {
    const source = this.#normalizeOptionalText(options.source);
    const action = this.#normalizeOptionalText(options.action);
    const from = options.from ? new Date(options.from).toISOString() : null;
    const to = options.to ? new Date(options.to).toISOString() : null;
    const limit = this.#normalizeLimit(options.limit);

    const filtered = entries.filter((entry) => {
      const value = entry.toJSON();
      if (source && value.source !== source) return false;
      if (action && value.action !== action) return false;
      if (from && value.timestamp < from) return false;
      if (to && value.timestamp > to) return false;
      if (options.result && value.result !== options.result) return false;
      return true;
    });

    const sorted = filtered.sort((left, right) => right.timestamp.toISOString().localeCompare(left.timestamp.toISOString()));
    return limit === null ? sorted : sorted.slice(0, limit);
  }

  #auditSummary(entry) {
    const action = entry.action.replaceAll('.', ' ');
    const result = entry.result === 'success' ? 'completed' : 'failed';
    return `${action} ${result}`;
  }

  #countBy(entries, key) {
    return entries.reduce((counts, entry) => {
      const value = entry[key] ?? 'unknown';
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    }, {});
  }

  #normalizeLimit(value) {
    if (value === undefined || value === null) return null;
    const normalized = Number(value);
    if (!Number.isInteger(normalized) || normalized < 1) {
      throw new Error('CredentialHistoryService limit must be a positive integer');
    }
    return normalized;
  }

  #normalizeOptionalText(value) {
    if (value === undefined || value === null || value === '') return null;
    return String(value).trim();
  }

  #clone(value) {
    if (value === null || value === undefined) return null;
    return JSON.parse(JSON.stringify(value));
  }

  #assertCredentialId(credentialId, operation) {
    if (!credentialId) {
      throw new Error(`CredentialHistoryService.${operation}() requires credentialId`);
    }
  }
}
