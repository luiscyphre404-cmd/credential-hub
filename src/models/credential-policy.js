export const CredentialPolicyStatus = Object.freeze({
  ACTIVE: 'active',
  DISABLED: 'disabled'
});

const VALID_STATUSES = new Set(Object.values(CredentialPolicyStatus));

export class CredentialPolicy {
  constructor({
    policyId,
    name,
    description = null,
    providerKey = null,
    credentialType = null,
    rotationIntervalDays = null,
    expiryWarningDays = 14,
    requiresRotation = false,
    ownerRoleKey = null,
    criticality = 'normal',
    status = CredentialPolicyStatus.ACTIVE,
    createdAt = new Date(),
    updatedAt = new Date(),
    version = 1
  }) {
    this.policyId = this.#required(policyId, 'policyId');
    this.name = this.#required(name, 'name');
    this.description = this.#optional(description, 'description');
    this.providerKey = this.#optional(providerKey, 'providerKey');
    this.credentialType = this.#optional(credentialType, 'credentialType');
    this.rotationIntervalDays = this.#positiveIntegerOrNull(rotationIntervalDays, 'rotationIntervalDays');
    this.expiryWarningDays = this.#nonNegativeInteger(expiryWarningDays, 'expiryWarningDays');
    this.requiresRotation = Boolean(requiresRotation);
    this.ownerRoleKey = this.#optional(ownerRoleKey, 'ownerRoleKey');
    this.criticality = this.#criticality(criticality);
    this.status = this.#status(status);
    this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
    this.updatedAt = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
    this.version = this.#positiveInteger(version, 'version');

    Object.freeze(this);
  }

  matchesCredential(credential) {
    const value = typeof credential?.toJSON === 'function' ? credential.toJSON() : credential;
    const metadata = value?.metadata ?? {};
    const credentialType = metadata.type ?? metadata.credentialType ?? metadata.custom?.type ?? null;

    if (this.status !== CredentialPolicyStatus.ACTIVE) return false;
    if (this.providerKey && value?.providerKey !== this.providerKey) return false;
    if (this.credentialType && credentialType !== this.credentialType) return false;

    return true;
  }

  withUpdates(updates = {}) {
    return new CredentialPolicy({
      ...this.toJSON(),
      ...updates,
      policyId: this.policyId,
      createdAt: this.createdAt,
      updatedAt: updates.updatedAt ?? new Date(),
      version: this.version + 1
    });
  }

  toJSON() {
    return {
      policyId: this.policyId,
      name: this.name,
      description: this.description,
      providerKey: this.providerKey,
      credentialType: this.credentialType,
      rotationIntervalDays: this.rotationIntervalDays,
      expiryWarningDays: this.expiryWarningDays,
      requiresRotation: this.requiresRotation,
      ownerRoleKey: this.ownerRoleKey,
      criticality: this.criticality,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      version: this.version
    };
  }

  static from(data) {
    if (data instanceof CredentialPolicy) return data;
    return new CredentialPolicy(data);
  }

  #required(value, name) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`CredentialPolicy: '${name}' is required`);
    }
    return value.trim();
  }

  #optional(value, name) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string') throw new Error(`CredentialPolicy: '${name}' must be a string`);
    return value.trim();
  }

  #positiveIntegerOrNull(value, name) {
    if (value === undefined || value === null || value === '') return null;
    return this.#positiveInteger(value, name);
  }

  #positiveInteger(value, name) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error(`CredentialPolicy: '${name}' must be a positive integer`);
    }
    return parsed;
  }

  #nonNegativeInteger(value, name) {
    const parsed = Number(value ?? 0);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`CredentialPolicy: '${name}' must be a non-negative integer`);
    }
    return parsed;
  }

  #criticality(value) {
    const normalized = this.#required(value, 'criticality');
    if (!['low', 'normal', 'high', 'critical'].includes(normalized)) {
      throw new Error("CredentialPolicy: 'criticality' must be low, normal, high or critical");
    }
    return normalized;
  }

  #status(value) {
    const normalized = this.#required(value, 'status');
    if (!VALID_STATUSES.has(normalized)) {
      throw new Error("CredentialPolicy: 'status' must be active or disabled");
    }
    return normalized;
  }
}
