import crypto from 'node:crypto';

export class ProviderConfigurationService {
  constructor({ store }) {
    if (!store?.load || !store?.save) {
      throw new Error('ProviderConfigurationService requires ProviderConfigurationStore');
    }
    this.store = store;
  }

  async prepare({ providerKey, fields = [], values, configurationId = null }) {
    const definitions = fields.filter((field) => field.section === 'providerConfiguration');
    const input = values && typeof values === 'object' && !Array.isArray(values)
      ? values
      : {};
    const allowedKeys = new Set(definitions.map((field) => field.key));
    const configuration = {};
    const missing = [];

    for (const field of definitions) {
      const value = input[field.key];
      if (field.required && (value === undefined || value === null || String(value).trim() === '')) {
        missing.push(field.key);
        continue;
      }
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        configuration[field.key] = typeof value === 'string' ? value.trim() : value;
      }
    }

    if (missing.length > 0) {
      throw this.#configurationError(missing);
    }

    for (const key of Object.keys(input)) {
      if (!allowedKeys.has(key)) {
        const error = new Error('Provider configuration contains unsupported fields');
        error.code = 'PROVIDER_CONFIGURATION_INVALID';
        error.statusCode = 400;
        throw error;
      }
    }

    const now = new Date().toISOString();
    const record = {
      configurationId: configurationId ?? crypto.randomUUID(),
      providerKey,
      configuration,
      createdAt: now,
      updatedAt: now
    };

    await this.store.save(record);
    return record;
  }

  async load(configurationId, providerKey = null) {
    const record = await this.store.load(configurationId);
    if (providerKey && record.providerKey !== providerKey) {
      const error = new Error('Provider configuration does not match provider');
      error.code = 'PROVIDER_CONFIGURATION_INVALID';
      error.statusCode = 400;
      throw error;
    }
    return record;
  }

  async remove(configurationId, providerKey = null) {
    if (!configurationId) return false;
    await this.load(configurationId, providerKey);
    return this.store.delete(configurationId);
  }

  toPublicJSON(record, fields = []) {
    const secretKeys = new Set(
      fields.filter((field) => field.section === 'providerConfiguration' && field.secret)
        .map((field) => field.key)
    );
    const configuredFields = Object.keys(record.configuration);
    return {
      configurationId: record.configurationId,
      providerKey: record.providerKey,
      configuredFields,
      maskedFields: configuredFields.filter((key) => secretKeys.has(key))
    };
  }

  #configurationError(missingFields) {
    const error = new Error('Required provider configuration is missing');
    error.code = 'PROVIDER_CONFIGURATION_MISSING';
    error.statusCode = 400;
    error.missingFields = [...missingFields];
    return error;
  }
}
