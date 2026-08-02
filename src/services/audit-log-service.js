export class AuditLogService {
  constructor({ store = null, clock = () => new Date() } = {}) {
    this.store = store;
    this.clock = clock;
    this.entries = [];
  }

  async record(input = {}) {
    const entry = this.#normalizeEntry(input);
    const entries = await this.#loadEntries();
    entries.push(entry);
    await this.#saveEntries(entries);
    return this.#entryItem(entry);
  }

  async list(filters = {}) {
    const entries = await this.#loadEntries();
    return entries
      .filter((entry) => this.#matchesFilters(entry, filters))
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .map((entry) => this.#entryItem(entry));
  }

  async get(entryId) {
    const normalizedEntryId = this.#normalizeRequiredString(entryId, 'entryId');
    const entries = await this.#loadEntries();
    const entry = entries.find((item) => item.entryId === normalizedEntryId);

    if (!entry) {
      throw this.#notFound(`Audit entry '${normalizedEntryId}' not found`);
    }

    return this.#entryItem(entry);
  }


  async replaceEntries(entries = []) {
    if (!Array.isArray(entries)) {
      throw this.#badRequest('entries must be an array');
    }

    const records = entries.map((entry) => ({
      entryId: this.#normalizeRequiredString(entry.entryId, 'entryId'),
      timestamp: this.#normalizeRequiredString(entry.timestamp, 'timestamp'),
      userId: this.#normalizeActor(entry.userId),
      roleKey: this.#normalizeOptionalString(entry.roleKey),
      action: this.#normalizeRequiredString(entry.action, 'action'),
      targetType: this.#normalizeRequiredString(entry.targetType, 'targetType'),
      targetId: this.#normalizeOptionalString(entry.targetId),
      result: this.#normalizeResult(entry.result),
      details: this.#cloneDetails(entry.details ?? null)
    }));

    await this.#saveEntries(records);
    return records.map((entry) => this.#entryItem(entry));
  }

  async #loadEntries() {
    if (!this.store?.load) {
      return this.entries.map((entry) => ({ ...entry, details: this.#cloneDetails(entry.details) }));
    }

    try {
      const data = await this.store.load();
      const entries = Array.isArray(data?.entries) ? data.entries : [];
      return entries.map((entry) => ({ ...entry, details: this.#cloneDetails(entry.details) }));
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async #saveEntries(entries) {
    const records = entries.map((entry) => ({ ...entry, details: this.#cloneDetails(entry.details) }));

    if (!this.store?.save) {
      this.entries = records;
      return;
    }

    await this.store.save({ entries: records });
  }

  #normalizeEntry(input) {
    const timestamp = this.#timestamp();

    return {
      entryId: input.entryId ?? this.#createEntryId(timestamp),
      timestamp,
      userId: this.#normalizeActor(input.userId),
      roleKey: this.#normalizeOptionalString(input.roleKey),
      action: this.#normalizeRequiredString(input.action, 'action'),
      targetType: this.#normalizeRequiredString(input.targetType, 'targetType'),
      targetId: this.#normalizeOptionalString(input.targetId),
      result: this.#normalizeResult(input.result ?? 'success'),
      details: this.#cloneDetails(input.details ?? null)
    };
  }

  #matchesFilters(entry, filters = {}) {
    if (filters.userId && entry.userId !== filters.userId) {
      return false;
    }
    if (filters.action && entry.action !== filters.action) {
      return false;
    }
    if (filters.targetType && entry.targetType !== filters.targetType) {
      return false;
    }
    if (filters.targetId && entry.targetId !== filters.targetId) {
      return false;
    }
    if (filters.result && entry.result !== filters.result) {
      return false;
    }
    if (filters.from && entry.timestamp < filters.from) {
      return false;
    }
    if (filters.to && entry.timestamp > filters.to) {
      return false;
    }
    return true;
  }

  #timestamp() {
    const value = this.clock();
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString();
  }

  #createEntryId(timestamp) {
    return `${timestamp}-${Math.random().toString(36).slice(2, 10)}`;
  }

  #entryItem(entry) {
    return {
      entryId: entry.entryId,
      timestamp: entry.timestamp,
      userId: entry.userId,
      roleKey: entry.roleKey,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      result: entry.result,
      details: this.#cloneDetails(entry.details)
    };
  }

  #normalizeActor(value) {
    if (typeof value !== 'string' || value.trim() === '') {
      return 'system';
    }
    return value.trim();
  }

  #normalizeRequiredString(value, name) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw this.#badRequest(`${name} must be a non-empty string`);
    }
    return value.trim();
  }

  #normalizeOptionalString(value) {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    if (typeof value !== 'string') {
      throw this.#badRequest('optional audit values must be strings');
    }
    return value.trim();
  }

  #normalizeResult(value) {
    const result = this.#normalizeRequiredString(value, 'result');
    if (!['success', 'failure'].includes(result)) {
      throw this.#badRequest('result must be success or failure');
    }
    return result;
  }

  #cloneDetails(details) {
    if (details === null || details === undefined) {
      return null;
    }
    return JSON.parse(JSON.stringify(details));
  }

  #badRequest(message) {
    const error = new Error(message);
    error.statusCode = 400;
    error.code = 'BAD_REQUEST';
    return error;
  }

  #notFound(message) {
    const error = new Error(message);
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    return error;
  }
}
