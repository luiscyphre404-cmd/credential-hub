export class MetricsService {
  constructor({ managementService, accessManagementService = null, auditLogService = null, exportService = null, backupRestoreService = null, clock = () => new Date() } = {}) {
    if (!managementService?.getStatus) {
      throw new Error('MetricsService requires ManagementService.getStatus()');
    }

    this.managementService = managementService;
    this.accessManagementService = accessManagementService;
    this.auditLogService = auditLogService;
    this.exportService = exportService;
    this.backupRestoreService = backupRestoreService;
    this.clock = clock;
  }

  async getMetrics() {
    const [status, users, roles, auditLog, backups, exportResources] = await Promise.all([
      this.managementService.getStatus(),
      this.#safeList(() => this.accessManagementService?.listUsers?.()),
      this.#safeList(() => this.accessManagementService?.listRoles?.()),
      this.#safeList(() => this.auditLogService?.list?.()),
      this.#safeList(() => this.backupRestoreService?.listBackups?.()),
      this.#safeExportResources()
    ]);

    const scheduler = status.scheduler ?? {};
    const providers = status.providers ?? { total: 0, byCapability: {}, items: [] };
    const credentials = status.credentials ?? { total: 0, byLifecycleState: {}, byProvider: {}, items: [] };

    return {
      generatedAt: this.#timestamp(),
      status: status.status ?? 'unknown',
      summary: {
        credentials: Number(credentials.total ?? 0),
        providers: Number(providers.total ?? 0),
        users: users.length,
        roles: roles.length,
        auditEntries: auditLog.length,
        backups: backups.length,
        schedulerJobs: Number(scheduler.jobCount ?? scheduler.jobs?.length ?? 0)
      },
      scheduler: this.#schedulerMetrics(scheduler),
      providers: this.#providerMetrics(providers),
      credentials: this.#credentialMetrics(credentials),
      accessManagement: this.#accessMetrics(users, roles),
      auditLog: this.#auditMetrics(auditLog),
      exports: this.#exportMetrics(exportResources),
      backups: this.#backupMetrics(backups)
    };
  }

  #schedulerMetrics(scheduler) {
    const runCount = Number(scheduler.runCount ?? 0);
    const failureCount = Number(scheduler.failureCount ?? 0);
    const successCount = Math.max(runCount - failureCount, 0);

    return {
      available: Boolean(scheduler.available),
      started: Boolean(scheduler.started),
      running: Boolean(scheduler.running),
      jobCount: Number(scheduler.jobCount ?? scheduler.jobs?.length ?? 0),
      runCount,
      successCount,
      failureCount,
      successRate: this.#rate(successCount, runCount),
      failureRate: this.#rate(failureCount, runCount),
      lastRunAt: scheduler.lastRunAt ?? null,
      lastSuccessAt: scheduler.lastSuccessAt ?? null,
      lastErrorAt: scheduler.lastErrorAt ?? null,
      nextRunAt: scheduler.nextRunAt ?? null
    };
  }

  #providerMetrics(providers) {
    const items = Array.isArray(providers.items) ? providers.items : [];
    return {
      total: Number(providers.total ?? items.length),
      byCapability: { ...(providers.byCapability ?? {}) },
      averageCapabilitiesPerProvider: items.length === 0
        ? 0
        : this.#round(items.reduce((sum, provider) => sum + Number(provider.capabilities?.length ?? 0), 0) / items.length),
      items: items.map((provider) => ({
        providerKey: provider.providerKey ?? provider.key ?? null,
        capabilityCount: Number(provider.capabilities?.length ?? 0),
        capabilities: [...(provider.capabilities ?? [])]
      }))
    };
  }

  #credentialMetrics(credentials) {
    const items = Array.isArray(credentials.items) ? credentials.items : [];
    return {
      total: Number(credentials.total ?? items.length),
      byLifecycleState: { ...(credentials.byLifecycleState ?? {}) },
      byProvider: { ...(credentials.byProvider ?? {}) },
      expiringCredentials: items.filter((item) => this.#isFutureWithinDays(item.expiresAt, 7)).length,
      expiredCredentials: items.filter((item) => this.#isPast(item.expiresAt)).length
    };
  }

  #accessMetrics(users, roles) {
    return {
      users: {
        total: users.length,
        active: users.filter((user) => user.status === 'active').length,
        disabled: users.filter((user) => user.status === 'disabled').length,
        byRole: this.#countBy(users, (user) => user.roleKey ?? 'unknown')
      },
      roles: {
        total: roles.length,
        permissionCount: roles.reduce((counts, role) => {
          counts[role.roleKey] = Number(role.permissions?.length ?? 0);
          return counts;
        }, {})
      }
    };
  }

  #auditMetrics(entries) {
    const success = entries.filter((entry) => entry.result === 'success').length;
    const failure = entries.filter((entry) => entry.result === 'failure').length;
    const total = entries.length;

    return {
      total,
      success,
      failure,
      successRate: this.#rate(success, total),
      failureRate: this.#rate(failure, total),
      byAction: this.#countBy(entries, (entry) => entry.action ?? 'unknown'),
      byResult: this.#countBy(entries, (entry) => entry.result ?? 'unknown'),
      latestEntryAt: entries
        .map((entry) => entry.createdAt ?? entry.timestamp ?? null)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null
    };
  }

  #exportMetrics(resources) {
    return {
      available: Array.isArray(resources),
      resourceCount: resources.length,
      resources: resources.map((resource) => resource.resource ?? resource)
    };
  }

  #backupMetrics(backups) {
    return {
      total: backups.length,
      latestBackupAt: backups.map((backup) => backup.generatedAt ?? null).filter(Boolean).sort().at(-1) ?? null,
      totalAuditEntriesBackedUp: backups.reduce((sum, backup) => sum + Number(backup.counts?.auditLog ?? 0), 0),
      totalUsersBackedUp: backups.reduce((sum, backup) => sum + Number(backup.counts?.users ?? 0), 0)
    };
  }

  async #safeExportResources() {
    if (typeof this.exportService?.listResources !== 'function') {
      return [];
    }
    return this.#safeList(() => this.exportService.listResources());
  }

  async #safeList(factory) {
    try {
      const value = await factory();
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  #countBy(items, keyFn) {
    return items.reduce((counts, item) => {
      const key = keyFn(item);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
  }

  #rate(value, total) {
    if (total <= 0) return 0;
    return this.#round(value / total);
  }

  #round(value) {
    return Math.round(Number(value) * 10000) / 10000;
  }

  #isPast(value) {
    if (!value) return false;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.getTime() < this.clock().getTime();
  }

  #isFutureWithinDays(value, days) {
    if (!value) return false;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return false;
    const now = this.clock().getTime();
    const then = date.getTime();
    return then >= now && then <= now + days * 24 * 60 * 60 * 1000;
  }

  #timestamp() {
    const value = this.clock();
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString();
  }
}
