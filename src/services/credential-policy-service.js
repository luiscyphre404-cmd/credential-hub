import crypto from 'node:crypto';

import { CredentialPolicy, CredentialPolicyStatus } from '../models/credential-policy.js';

export class CredentialPolicyService {
  constructor({ store = null, auditLogService = null, clock = () => new Date() } = {}) {
    this.store = store;
    this.auditLogService = auditLogService;
    this.clock = clock;
    this.policies = [];
  }

  async createPolicy(input = {}, context = {}) {
    const now = this.#timestamp();
    const policy = CredentialPolicy.from({
      ...input,
      policyId: input.policyId ?? this.#createPolicyId(input.name),
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now
    });

    const policies = await this.#loadPolicies();

    if (policies.some((item) => item.policyId === policy.policyId)) {
      throw this.#badRequest(`Credential policy '${policy.policyId}' already exists`);
    }

    policies.push(policy);
    await this.#savePolicies(policies);
    await this.#recordAudit('credential-policy.created', policy, context);
    return policy;
  }

  async listPolicies(filters = {}) {
    const policies = await this.#loadPolicies();
    return policies
      .filter((policy) => this.#matchesFilters(policy, filters))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async getPolicy(policyId) {
    const normalizedPolicyId = this.#required(policyId, 'policyId');
    const policies = await this.#loadPolicies();
    const policy = policies.find((item) => item.policyId === normalizedPolicyId);

    if (!policy) {
      throw this.#notFound(`Credential policy '${normalizedPolicyId}' not found`);
    }

    return policy;
  }

  async updatePolicy(policyId, updates = {}, context = {}) {
    const existingPolicy = await this.getPolicy(policyId);
    const policies = await this.#loadPolicies();
    const nextPolicy = existingPolicy.withUpdates({ ...updates, updatedAt: this.#timestamp() });
    const nextPolicies = policies.map((policy) => policy.policyId === nextPolicy.policyId ? nextPolicy : policy);

    await this.#savePolicies(nextPolicies);
    await this.#recordAudit('credential-policy.updated', nextPolicy, context);
    return nextPolicy;
  }

  async disablePolicy(policyId, context = {}) {
    const policy = await this.updatePolicy(policyId, { status: CredentialPolicyStatus.DISABLED }, context);
    await this.#recordAudit('credential-policy.disabled', policy, context);
    return policy;
  }

  async deletePolicy(policyId, context = {}) {
    const policy = await this.getPolicy(policyId);
    const policies = await this.#loadPolicies();
    await this.#savePolicies(policies.filter((item) => item.policyId !== policy.policyId));
    await this.#recordAudit('credential-policy.deleted', policy, context);
    return policy;
  }

  async findPoliciesForCredential(credential) {
    const policies = await this.listPolicies({ status: CredentialPolicyStatus.ACTIVE });
    return policies.filter((policy) => policy.matchesCredential(credential));
  }

  async evaluateCredential(credential, referenceDate = this.clock()) {
    const value = typeof credential?.toJSON === 'function' ? credential.toJSON() : credential;
    const policies = await this.findPoliciesForCredential(value);
    const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    const expiresAt = this.#dateOrNull(value?.metadata?.expiresAt);
    const lastRotatedAt = this.#dateOrNull(value?.metadata?.lastRotatedAt ?? value?.metadata?.lastRefreshAt ?? value?.updatedAt);

    const violations = [];
    const warnings = [];

    for (const policy of policies) {
      if (expiresAt) {
        const daysUntilExpiry = this.#daysBetween(now, expiresAt);
        if (daysUntilExpiry < 0) {
          violations.push({ policyId: policy.policyId, type: 'expired', daysOverdue: Math.abs(daysUntilExpiry) });
        } else if (daysUntilExpiry <= policy.expiryWarningDays) {
          warnings.push({ policyId: policy.policyId, type: 'expires-soon', daysUntilExpiry });
        }
      }

      if (policy.requiresRotation && policy.rotationIntervalDays) {
        if (!lastRotatedAt) {
          warnings.push({ policyId: policy.policyId, type: 'rotation-date-missing' });
        } else {
          const daysSinceRotation = this.#daysBetween(lastRotatedAt, now);
          if (daysSinceRotation > policy.rotationIntervalDays) {
            violations.push({ policyId: policy.policyId, type: 'rotation-overdue', daysOverdue: daysSinceRotation - policy.rotationIntervalDays });
          }
        }
      }
    }

    return {
      credentialId: value?.credentialId ?? null,
      providerKey: value?.providerKey ?? null,
      evaluatedAt: now.toISOString(),
      matchedPolicies: policies.map((policy) => policy.toJSON()),
      warnings,
      violations,
      compliant: violations.length === 0
    };
  }

  async #loadPolicies() {
    if (!this.store?.load) {
      return this.policies.map((policy) => CredentialPolicy.from(policy.toJSON()));
    }

    try {
      const data = await this.store.load();
      const policies = Array.isArray(data?.policies) ? data.policies : [];
      return policies.map((policy) => CredentialPolicy.from(policy));
    } catch (error) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
  }

  async #savePolicies(policies) {
    const records = policies.map((policy) => CredentialPolicy.from(policy).toJSON());

    if (!this.store?.save) {
      this.policies = policies.map((policy) => CredentialPolicy.from(policy));
      return;
    }

    await this.store.save({ policies: records });
  }

  #matchesFilters(policy, filters = {}) {
    if (filters.status && policy.status !== filters.status) return false;
    if (filters.providerKey && policy.providerKey !== filters.providerKey) return false;
    if (filters.credentialType && policy.credentialType !== filters.credentialType) return false;
    if (filters.ownerRoleKey && policy.ownerRoleKey !== filters.ownerRoleKey) return false;
    return true;
  }

  async #recordAudit(action, policy, context = {}) {
    if (!this.auditLogService?.record) return;

    await this.auditLogService.record({
      userId: context.userId,
      roleKey: context.roleKey,
      action,
      targetType: 'credential-policy',
      targetId: policy.policyId,
      result: 'success',
      details: {
        name: policy.name,
        providerKey: policy.providerKey,
        credentialType: policy.credentialType,
        status: policy.status
      }
    });
  }

  #timestamp() {
    const value = this.clock();
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString();
  }

  #createPolicyId(name) {
    const prefix = typeof name === 'string' && name.trim() !== ''
      ? name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
      : 'credential-policy';
    return `${prefix || 'credential-policy'}-${crypto.randomUUID().slice(0, 8)}`;
  }

  #required(value, name) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw this.#badRequest(`${name} must be a non-empty string`);
    }
    return value.trim();
  }

  #dateOrNull(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  #daysBetween(left, right) {
    return Math.floor((right.getTime() - left.getTime()) / 86_400_000);
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
