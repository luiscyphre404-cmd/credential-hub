import crypto from 'node:crypto';

export const LifecycleNotificationStatus = Object.freeze({
  OPEN: 'open',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved'
});

export const LifecycleNotificationSeverity = Object.freeze({
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
});

const VALID_STATUSES = new Set(Object.values(LifecycleNotificationStatus));
const VALID_SEVERITIES = new Set(Object.values(LifecycleNotificationSeverity));

export class LifecycleNotification {
  constructor({
    notificationId = crypto.randomUUID(),
    type,
    severity = LifecycleNotificationSeverity.INFO,
    message,
    credentialId = null,
    providerKey = null,
    status = LifecycleNotificationStatus.OPEN,
    createdAt = new Date(),
    updatedAt = new Date(),
    acknowledgedAt = null,
    resolvedAt = null,
    metadata = {}
  }) {
    this.notificationId = this.#required(notificationId, 'notificationId');
    this.type = this.#required(type, 'type');
    this.severity = this.#enumValue(severity, VALID_SEVERITIES, 'severity');
    this.message = this.#required(message, 'message');
    this.credentialId = this.#optional(credentialId, 'credentialId');
    this.providerKey = this.#optional(providerKey, 'providerKey');
    this.status = this.#enumValue(status, VALID_STATUSES, 'status');
    this.createdAt = this.#date(createdAt, 'createdAt');
    this.updatedAt = this.#date(updatedAt, 'updatedAt');
    this.acknowledgedAt = acknowledgedAt ? this.#date(acknowledgedAt, 'acknowledgedAt') : null;
    this.resolvedAt = resolvedAt ? this.#date(resolvedAt, 'resolvedAt') : null;
    this.metadata = Object.freeze({ ...(metadata ?? {}) });

    Object.freeze(this);
  }

  acknowledge(timestamp = new Date()) {
    return new LifecycleNotification({
      ...this.toJSON(),
      status: LifecycleNotificationStatus.ACKNOWLEDGED,
      acknowledgedAt: this.acknowledgedAt ?? timestamp,
      updatedAt: timestamp
    });
  }

  resolve(timestamp = new Date()) {
    return new LifecycleNotification({
      ...this.toJSON(),
      status: LifecycleNotificationStatus.RESOLVED,
      resolvedAt: this.resolvedAt ?? timestamp,
      updatedAt: timestamp
    });
  }

  toJSON() {
    return {
      notificationId: this.notificationId,
      type: this.type,
      severity: this.severity,
      message: this.message,
      credentialId: this.credentialId,
      providerKey: this.providerKey,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      acknowledgedAt: this.acknowledgedAt ? this.acknowledgedAt.toISOString() : null,
      resolvedAt: this.resolvedAt ? this.resolvedAt.toISOString() : null,
      metadata: { ...this.metadata }
    };
  }

  static from(data) {
    if (data instanceof LifecycleNotification) return data;
    return new LifecycleNotification(data);
  }

  #required(value, name) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`LifecycleNotification: '${name}' is required`);
    }
    return value.trim();
  }

  #optional(value, name) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string') throw new Error(`LifecycleNotification: '${name}' must be a string`);
    return value.trim();
  }

  #enumValue(value, allowed, name) {
    const normalized = this.#required(value, name);
    if (!allowed.has(normalized)) {
      throw new Error(`LifecycleNotification: '${name}' is invalid`);
    }
    return normalized;
  }

  #date(value, name) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error(`LifecycleNotification: '${name}' must be a valid date`);
    return date;
  }
}
