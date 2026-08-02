export class CredentialHistoryEntry {
  constructor({
    historyId,
    credentialId,
    timestamp = new Date(),
    source,
    action,
    result = 'success',
    actor = 'system',
    summary,
    details = null
  }) {
    if (!historyId) throw new Error("CredentialHistoryEntry: 'historyId' is required");
    if (!credentialId) throw new Error("CredentialHistoryEntry: 'credentialId' is required");
    if (!source) throw new Error("CredentialHistoryEntry: 'source' is required");
    if (!action) throw new Error("CredentialHistoryEntry: 'action' is required");
    if (!summary) throw new Error("CredentialHistoryEntry: 'summary' is required");

    const normalizedTimestamp = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (Number.isNaN(normalizedTimestamp.getTime())) {
      throw new Error("CredentialHistoryEntry: 'timestamp' must be a valid date");
    }

    this.historyId = historyId;
    this.credentialId = credentialId;
    this.timestamp = normalizedTimestamp;
    this.source = source;
    this.action = action;
    this.result = result;
    this.actor = actor;
    this.summary = summary;
    this.details = details === null || details === undefined
      ? null
      : JSON.parse(JSON.stringify(details));

    Object.freeze(this);
  }

  toJSON() {
    return {
      historyId: this.historyId,
      credentialId: this.credentialId,
      timestamp: this.timestamp.toISOString(),
      source: this.source,
      action: this.action,
      result: this.result,
      actor: this.actor,
      summary: this.summary,
      details: this.details === null ? null : JSON.parse(JSON.stringify(this.details))
    };
  }

  static from(data) {
    if (data instanceof CredentialHistoryEntry) return data;
    return new CredentialHistoryEntry(data);
  }
}
