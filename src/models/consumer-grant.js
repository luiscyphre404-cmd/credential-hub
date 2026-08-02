import crypto from 'node:crypto';

function required(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`ConsumerGrant: '${name}' is required`);
  }
  return value.trim();
}

function normalizeSecretNames(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("ConsumerGrant: 'secretNames' must be a non-empty array");
  }

  const names = value.map((name) => required(name, 'secretNames'));
  return Object.freeze([...new Set(names)]);
}

export class ConsumerGrant {
  constructor({
    grantId = crypto.randomUUID(),
    consumerId,
    credentialId,
    providerKey,
    secretNames,
    createdAt = new Date(),
    updatedAt = new Date()
  } = {}) {
    this.grantId = required(grantId, 'grantId');
    this.consumerId = required(consumerId, 'consumerId');
    this.credentialId = required(credentialId, 'credentialId');
    this.providerKey = required(providerKey, 'providerKey');
    this.secretNames = normalizeSecretNames(secretNames);
    this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
    this.updatedAt = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);

    if (Number.isNaN(this.createdAt.getTime()) || Number.isNaN(this.updatedAt.getTime())) {
      throw new Error('ConsumerGrant: timestamps must be valid dates');
    }

    Object.freeze(this);
  }

  toJSON() {
    return {
      grantId: this.grantId,
      consumerId: this.consumerId,
      credentialId: this.credentialId,
      providerKey: this.providerKey,
      secretNames: [...this.secretNames],
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }

  static from(value) {
    return value instanceof ConsumerGrant ? value : new ConsumerGrant(value);
  }
}
