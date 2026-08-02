import {
  LifecycleNotification,
  LifecycleNotificationSeverity,
  LifecycleNotificationStatus
} from '../models/lifecycle-notification.js';

export class LifecycleNotificationService {
  constructor({ store = null, auditLogService = null, clock = () => new Date() } = {}) {
    this.store = store;
    this.auditLogService = auditLogService;
    this.clock = clock;
    this.notifications = [];
  }

  async createNotification(input = {}, context = {}) {
    const now = this.#timestamp();
    const notification = LifecycleNotification.from({
      ...input,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now
    });
    const notifications = await this.#loadNotifications();

    notifications.push(notification);
    await this.#saveNotifications(notifications);
    await this.#recordAudit('lifecycle-notification.created', notification, context);
    return notification;
  }

  async createForPolicyEvaluation(evaluation, context = {}) {
    const notifications = [];
    const credentialId = evaluation?.credentialId ?? null;
    const providerKey = evaluation?.providerKey ?? null;

    for (const violation of evaluation?.violations ?? []) {
      notifications.push(await this.createNotification({
        type: `policy.${violation.type}`,
        severity: violation.type === 'expired' || violation.type === 'rotation-overdue'
          ? LifecycleNotificationSeverity.CRITICAL
          : LifecycleNotificationSeverity.WARNING,
        message: this.#policyMessage(violation),
        credentialId,
        providerKey,
        metadata: { finding: violation, matchedPolicies: evaluation.matchedPolicies ?? [] }
      }, context));
    }

    for (const warning of evaluation?.warnings ?? []) {
      notifications.push(await this.createNotification({
        type: `policy.${warning.type}`,
        severity: LifecycleNotificationSeverity.WARNING,
        message: this.#policyMessage(warning),
        credentialId,
        providerKey,
        metadata: { finding: warning, matchedPolicies: evaluation.matchedPolicies ?? [] }
      }, context));
    }

    return notifications;
  }

  async createForRotationResult(result, context = {}) {
    const severity = result?.success ? LifecycleNotificationSeverity.INFO : LifecycleNotificationSeverity.CRITICAL;
    const type = result?.success ? 'rotation.completed' : 'rotation.failed';
    const message = result?.success
      ? `Credential ${result.credentialId} rotated successfully`
      : `Credential ${result?.credentialId ?? 'unknown'} rotation failed`;

    return this.createNotification({
      type,
      severity,
      message,
      credentialId: result?.credentialId ?? null,
      providerKey: result?.providerKey ?? null,
      metadata: {
        findings: result?.findings ?? [],
        error: result?.error ?? null
      }
    }, context);
  }

  async listNotifications(filters = {}) {
    const notifications = await this.#loadNotifications();
    return notifications
      .filter((notification) => this.#matchesFilters(notification, filters))
      .sort((left, right) => right.createdAt.toISOString().localeCompare(left.createdAt.toISOString()));
  }

  async getNotification(notificationId) {
    const normalizedNotificationId = this.#required(notificationId, 'notificationId');
    const notifications = await this.#loadNotifications();
    const notification = notifications.find((item) => item.notificationId === normalizedNotificationId);

    if (!notification) throw this.#notFound(`Lifecycle notification '${normalizedNotificationId}' not found`);
    return notification;
  }

  async acknowledgeNotification(notificationId, context = {}) {
    const notification = await this.getNotification(notificationId);
    const nextNotification = notification.acknowledge(this.clock());
    await this.#replaceNotification(nextNotification);
    await this.#recordAudit('lifecycle-notification.acknowledged', nextNotification, context);
    return nextNotification;
  }

  async resolveNotification(notificationId, context = {}) {
    const notification = await this.getNotification(notificationId);
    const nextNotification = notification.resolve(this.clock());
    await this.#replaceNotification(nextNotification);
    await this.#recordAudit('lifecycle-notification.resolved', nextNotification, context);
    return nextNotification;
  }

  async summarizeNotifications(filters = {}) {
    const notifications = await this.listNotifications(filters);
    const byStatus = this.#countBy(notifications, 'status');
    const bySeverity = this.#countBy(notifications, 'severity');

    return {
      generatedAt: this.#timestamp(),
      total: notifications.length,
      open: byStatus[LifecycleNotificationStatus.OPEN] ?? 0,
      acknowledged: byStatus[LifecycleNotificationStatus.ACKNOWLEDGED] ?? 0,
      resolved: byStatus[LifecycleNotificationStatus.RESOLVED] ?? 0,
      critical: bySeverity[LifecycleNotificationSeverity.CRITICAL] ?? 0,
      warning: bySeverity[LifecycleNotificationSeverity.WARNING] ?? 0,
      info: bySeverity[LifecycleNotificationSeverity.INFO] ?? 0,
      byStatus,
      bySeverity
    };
  }

  async #replaceNotification(nextNotification) {
    const notifications = await this.#loadNotifications();
    await this.#saveNotifications(notifications.map((notification) => (
      notification.notificationId === nextNotification.notificationId ? nextNotification : notification
    )));
  }

  async #loadNotifications() {
    if (!this.store?.load) {
      return this.notifications.map((notification) => LifecycleNotification.from(notification.toJSON()));
    }

    try {
      const data = await this.store.load();
      const notifications = Array.isArray(data?.notifications) ? data.notifications : [];
      return notifications.map((notification) => LifecycleNotification.from(notification));
    } catch (error) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
  }

  async #saveNotifications(notifications) {
    const records = notifications.map((notification) => LifecycleNotification.from(notification).toJSON());

    if (!this.store?.save) {
      this.notifications = records.map((notification) => LifecycleNotification.from(notification));
      return;
    }

    await this.store.save({ notifications: records });
  }

  #matchesFilters(notification, filters = {}) {
    if (filters.status && notification.status !== filters.status) return false;
    if (filters.severity && notification.severity !== filters.severity) return false;
    if (filters.type && notification.type !== filters.type) return false;
    if (filters.credentialId && notification.credentialId !== filters.credentialId) return false;
    if (filters.providerKey && notification.providerKey !== filters.providerKey) return false;
    return true;
  }

  async #recordAudit(action, notification, context = {}) {
    if (!this.auditLogService?.record) return;

    await this.auditLogService.record({
      userId: context.userId,
      roleKey: context.roleKey,
      action,
      targetType: 'lifecycle-notification',
      targetId: notification.notificationId,
      result: 'success',
      details: {
        type: notification.type,
        severity: notification.severity,
        status: notification.status,
        credentialId: notification.credentialId,
        providerKey: notification.providerKey
      }
    });
  }

  #policyMessage(finding) {
    if (finding.type === 'expired') return `Credential is expired by ${finding.daysOverdue} day(s)`;
    if (finding.type === 'expires-soon') return `Credential expires in ${finding.daysUntilExpiry} day(s)`;
    if (finding.type === 'rotation-overdue') return `Credential rotation is overdue by ${finding.daysOverdue} day(s)`;
    if (finding.type === 'rotation-date-missing') return 'Credential rotation date is missing';
    return `Credential policy finding: ${finding.type}`;
  }

  #countBy(items, field) {
    return items.reduce((result, item) => {
      result[item[field]] = (result[item[field]] ?? 0) + 1;
      return result;
    }, {});
  }

  #timestamp() {
    const value = this.clock();
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString();
  }

  #required(value, name) {
    if (typeof value !== 'string' || value.trim() === '') throw this.#badRequest(`${name} must be a non-empty string`);
    return value.trim();
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
