import { ProviderOperationCapabilities } from '../models/provider-capability.js';

export class DashboardService {
  constructor({
    credentialManager,
    providerManager,
    schedulerService = null,
    credentialPolicyService = null,
    credentialRotationService = null,
    credentialHistoryService = null,
    lifecycleNotificationService = null
  } = {}) {
    this.credentialManager = credentialManager;
    this.providerManager = providerManager;
    this.schedulerService = schedulerService;
    this.credentialPolicyService = credentialPolicyService;
    this.credentialRotationService = credentialRotationService;
    this.credentialHistoryService = credentialHistoryService;
    this.lifecycleNotificationService = lifecycleNotificationService;
  }

  async getDashboard(options = {}) {
  const now = new Date();
  const expiringWindowDays = this.#positiveInteger(options.expiringWithinDays, 14, 'expiringWithinDays');
  const expiringUntil = new Date(now.getTime() + expiringWindowDays * 24 * 60 * 60 * 1000);

  const credentialResult = await this.#safeSection('credentials', async () => {
    this.#assertCredentialManager('listCredentials');
    const credentials = await this.credentialManager.listCredentials();
    return credentials.map((credential) => this.#toJSON(credential));
  });

  const providerResult = await this.#safeSection('providers', async () => {
    this.#assertProviderManager('listProviders');
    const providers = await this.providerManager.listProviders();
    return providers.map((provider) => this.#toProviderJSON(provider));
  });

  const schedulerResult = await this.#safeSection('scheduler', async () => this.#schedulerSummary());
  const lifecycleResult = await this.#safeSection('lifecycle', async () => this.#lifecycleSummary({
    credentials: credentialResult.data ?? [],
    referenceDate: now
  }));

  const normalizedCredentials = credentialResult.data ?? [];
  const normalizedProviders = providerResult.data ?? [];
  const serviceErrors = [credentialResult.error, providerResult.error, schedulerResult.error, lifecycleResult.error].filter(Boolean);

  return {
    generatedAt: now.toISOString(),
    credentials: credentialResult.error
      ? this.#unavailableCredentialSummary()
      : this.#credentialSummary(normalizedCredentials, expiringUntil),
    providers: providerResult.error
      ? this.#unavailableProviderSummary()
      : this.#providerSummary(normalizedProviders, normalizedCredentials),
    scheduler: schedulerResult.error
      ? this.#unavailableSchedulerSummary()
      : schedulerResult.data,
    lifecycle: lifecycleResult.error
      ? this.#unavailableLifecycleSummary()
      : lifecycleResult.data,
    warnings: this.#warnings({
      credentials: normalizedCredentials,
      providers: normalizedProviders,
      expiringUntil,
      serviceErrors
    })
  };
}



async #lifecycleSummary({ credentials, referenceDate }) {
  const policySummary = await this.#policyDashboard(credentials, referenceDate);
  const rotationSummary = await this.#rotationDashboard(referenceDate);
  const secretSummary = await this.#secretVersionDashboard(credentials);
  const historySummary = await this.#historyDashboard(credentials);
  const notificationSummary = await this.#notificationDashboard();

  return {
    policies: policySummary,
    rotation: rotationSummary,
    secretVersions: secretSummary,
    history: historySummary,
    notifications: notificationSummary,
    health: this.#lifecycleHealth({
      policies: policySummary,
      rotation: rotationSummary,
      notifications: notificationSummary
    })
  };
}

async #policyDashboard(credentials, referenceDate) {
  if (!this.credentialPolicyService?.listPolicies || !this.credentialPolicyService?.evaluateCredential) {
    return this.#unavailablePolicySummary();
  }

  const policies = (await this.credentialPolicyService.listPolicies()).map((policy) => this.#toJSON(policy));
  const evaluations = [];

  for (const credential of credentials) {
    evaluations.push(await this.credentialPolicyService.evaluateCredential(credential, referenceDate));
  }

  const violations = evaluations.flatMap((evaluation) => evaluation.violations ?? []);
  const warnings = evaluations.flatMap((evaluation) => evaluation.warnings ?? []);

  return {
    total: policies.length,
    active: policies.filter((policy) => policy.status === 'active').length,
    disabled: policies.filter((policy) => policy.status === 'disabled').length,
    byProvider: this.#countBy(policies, (policy) => policy.providerKey ?? 'global'),
    evaluatedCredentials: evaluations.length,
    compliantCredentials: evaluations.filter((evaluation) => evaluation.compliant).length,
    warningCount: warnings.length,
    violationCount: violations.length,
    credentialsWithWarnings: evaluations.filter((evaluation) => (evaluation.warnings ?? []).length > 0).map((evaluation) => evaluation.credentialId),
    credentialsWithViolations: evaluations.filter((evaluation) => (evaluation.violations ?? []).length > 0).map((evaluation) => evaluation.credentialId)
  };
}

async #rotationDashboard(referenceDate) {
  if (!this.credentialRotationService?.planRotation) {
    return this.#unavailableRotationSummary();
  }

  const plan = await this.credentialRotationService.planRotation({
    referenceDate,
    includeWarnings: true
  });

  return {
    plannedAt: plan.plannedAt,
    requested: plan.requested,
    dueCount: plan.candidates,
    skippedCount: plan.skipped,
    candidates: (plan.items ?? []).map((item) => ({
      credentialId: item.credentialId,
      providerKey: item.providerKey,
      findingCount: (item.findings ?? []).length,
      policyCount: (item.policies ?? []).length
    }))
  };
}

async #secretVersionDashboard(credentials) {
  if (!this.credentialManager?.listSecretVersions) {
    return this.#unavailableSecretVersionSummary();
  }

  const items = [];

  for (const credential of credentials) {
    const credentialId = credential.credentialId;
    if (!credentialId) continue;
    const versions = await this.credentialManager.listSecretVersions(credentialId);
    items.push({
      credentialId,
      providerKey: credential.providerKey ?? null,
      versionCount: versions.length,
      latestVersion: versions[0]?.version ?? null,
      latestVersionAt: versions[0]?.createdAt?.toISOString?.() ?? versions[0]?.createdAt ?? null
    });
  }

  return {
    totalVersions: items.reduce((sum, item) => sum + item.versionCount, 0),
    credentialsWithVersions: items.filter((item) => item.versionCount > 0).length,
    credentialsWithoutVersions: credentials.length - items.filter((item) => item.versionCount > 0).length,
    items
  };
}

async #historyDashboard(credentials) {
  if (!this.credentialHistoryService?.summarizeCredentialHistory) {
    return this.#unavailableHistorySummary();
  }

  const items = [];

  for (const credential of credentials) {
    const credentialId = credential.credentialId;
    if (!credentialId) continue;
    const summary = await this.credentialHistoryService.summarizeCredentialHistory(credentialId, { includeEntries: false });
    items.push({
      credentialId,
      providerKey: credential.providerKey ?? null,
      total: summary.total,
      firstEventAt: summary.firstEventAt,
      lastEventAt: summary.lastEventAt,
      countsBySource: summary.countsBySource,
      countsByResult: summary.countsByResult
    });
  }

  return {
    totalEvents: items.reduce((sum, item) => sum + item.total, 0),
    credentialsWithHistory: items.filter((item) => item.total > 0).length,
    credentialsWithoutHistory: credentials.length - items.filter((item) => item.total > 0).length,
    items
  };
}

async #notificationDashboard() {
  if (!this.lifecycleNotificationService?.summarizeNotifications) {
    return this.#unavailableNotificationSummary();
  }

  return this.lifecycleNotificationService.summarizeNotifications();
}

#lifecycleHealth({ policies, rotation, notifications }) {
  const criticalNotifications = Number(notifications.critical ?? 0);
  const policyViolations = Number(policies.violationCount ?? 0);
  const dueRotations = Number(rotation.dueCount ?? 0);

  if (policies.status === 'unavailable' || rotation.status === 'unavailable') return 'degraded';
  if (criticalNotifications > 0 || policyViolations > 0) return 'critical';
  if (dueRotations > 0 || Number(policies.warningCount ?? 0) > 0) return 'warning';
  return 'ok';
}

#unavailableLifecycleSummary() {
  return {
    status: 'unavailable',
    policies: this.#unavailablePolicySummary(),
    rotation: this.#unavailableRotationSummary(),
    secretVersions: this.#unavailableSecretVersionSummary(),
    history: this.#unavailableHistorySummary(),
    notifications: this.#unavailableNotificationSummary(),
    health: 'degraded'
  };
}

#unavailablePolicySummary() {
  return {
    status: 'unavailable',
    total: 0,
    active: 0,
    disabled: 0,
    byProvider: {},
    evaluatedCredentials: 0,
    compliantCredentials: 0,
    warningCount: 0,
    violationCount: 0,
    credentialsWithWarnings: [],
    credentialsWithViolations: []
  };
}

#unavailableRotationSummary() {
  return {
    status: 'unavailable',
    plannedAt: null,
    requested: 0,
    dueCount: 0,
    skippedCount: 0,
    candidates: []
  };
}

#unavailableSecretVersionSummary() {
  return {
    status: 'unavailable',
    totalVersions: 0,
    credentialsWithVersions: 0,
    credentialsWithoutVersions: 0,
    items: []
  };
}

#unavailableHistorySummary() {
  return {
    status: 'unavailable',
    totalEvents: 0,
    credentialsWithHistory: 0,
    credentialsWithoutHistory: 0,
    items: []
  };
}

#unavailableNotificationSummary() {
  return {
    status: 'unavailable',
    generatedAt: null,
    total: 0,
    open: 0,
    acknowledged: 0,
    resolved: 0,
    critical: 0,
    warning: 0,
    info: 0,
    byStatus: {},
    bySeverity: {}
  };
}

async #safeSection(section, operation) {
  try {
    return {
      data: await operation(),
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: {
        section,
        message: error.message ?? 'Unexpected error'
      }
    };
  }
}

#credentialSummary(credentials, expiringUntil) {
  const byLifecycleState = this.#countBy(
    credentials,
    (credential) => credential.lifecycleState ?? 'unknown'
  );

  const byProvider = this.#countBy(
    credentials,
    (credential) => credential.providerKey ?? 'unknown'
  );

  const byCredentialType = this.#countBy(
    credentials,
    (credential) =>
      credential.metadata?.custom?.credentialType ??
      credential.metadata?.custom?.type ??
      'unknown'
  );
  const byCredentialMethod = this.#countBy(
    credentials,
    (credential) => credential.credentialMethodKey ?? 'unknown'
  );

  const expiring = this.#expiringCredentials(credentials, expiringUntil);
  const expired = credentials.filter((credential) => this.#isExpired(credential));

  const withExpiration = credentials.filter(
    (credential) => credential.metadata?.expiresAt
  );

  const withoutExpiration = credentials.length - withExpiration.length;

  return {
    total: credentials.length,
    byLifecycleState,
    byProvider,
    byCredentialType,
    byCredentialMethod,
    validCount: credentials.length - expired.length,
    expiredCount: expired.length,
    expiringSoon: expiring,
    expiringSoonCount: expiring.length,
    withExpirationCount: withExpiration.length,
    withoutExpirationCount: withoutExpiration
  };
}

#unavailableCredentialSummary() {
  return {
    status: 'unavailable',
    total: 0,
    byLifecycleState: {},
    byProvider: {},
    byCredentialType: {},
    byCredentialMethod: {},
    validCount: 0,
    expiredCount: 0,
    expiringSoon: [],
    expiringSoonCount: 0,
    withExpirationCount: 0,
    withoutExpirationCount: 0
  };
}


  #providerSummary(providers, credentials) {
    const providerItems = providers.map((provider) => {
      const credentialCount = credentials.filter((credential) => credential.providerKey === provider.providerKey).length;
      const capabilitySet = new Set(provider.capabilities ?? []);

      return {
        ...provider,
        credentialCount,
        supportsOAuth: capabilitySet.has('oauth'),
        supportsRefresh: capabilitySet.has('refresh'),
        supportsHealthCheck: capabilitySet.has('health-check'),
        supportsValidation: capabilitySet.has('validation'),
        supportsRevoke: capabilitySet.has('revoke')
      };
    });
    const withCredentials = providerItems.filter((provider) => provider.credentialCount > 0).length;

    return {
      total: providers.length,
      withCredentials,
      withoutCredentials: providers.length - withCredentials,
      byCapability: this.#providerCapabilitySummary(providers),
      items: providerItems
    };
  }

#unavailableProviderSummary() {
  return {
    status: 'unavailable',
    total: 0,
    withCredentials: 0,
    withoutCredentials: 0,
    byCapability: this.#providerCapabilitySummary([]),
    items: []
  };
}


  #providerCapabilitySummary(providers) {
    return ProviderOperationCapabilities.reduce((counts, capability) => {
      counts[capability] = providers.filter((provider) =>
        (provider.capabilities ?? []).includes(capability)
      ).length;
      return counts;
    }, {});
  }

  #warnings({ credentials, providers, expiringUntil, serviceErrors = [] }) {
  const providerKeys = new Set(providers.map((provider) => provider.providerKey));
  const unknownProviderCredentials = credentials
    .filter((credential) => credential.providerKey && !providerKeys.has(credential.providerKey))
    .map((credential) => credential.credentialId);

  return {
    expiredCredentials: credentials
      .filter((credential) => this.#isExpired(credential))
      .map((credential) => credential.credentialId),
    expiringSoonCredentials: this.#expiringCredentials(credentials, expiringUntil)
      .map((credential) => credential.credentialId),
    unknownProviderCredentials,
    serviceErrors
  };
}

  #expiringCredentials(credentials, expiringUntil) {
    return credentials
      .filter((credential) => {
        const expiresAt = this.#expiresAt(credential);
        if (!expiresAt) return false;
        return expiresAt.getTime() > Date.now() && expiresAt <= expiringUntil;
      })
      .map((credential) => ({
        credentialId: credential.credentialId,
        providerKey: credential.providerKey,
        displayName: credential.metadata?.displayName ?? null,
        expiresAt: this.#expiresAt(credential).toISOString()
      }));
  }

  #isExpired(credential) {
    const expiresAt = this.#expiresAt(credential);
    return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
  }

  #expiresAt(credential) {
    const value = credential?.metadata?.expiresAt ?? credential?.expiresAt ?? null;
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

#schedulerSummary() {
  if (typeof this.schedulerService?.getStatus === 'function') {
    const status = this.schedulerService.getStatus();
    const jobs = (status.jobs ?? []).map((job) => ({ ...job }));

    return {
      started: Boolean(status.started),
      running: Boolean(status.running),
      startedAt: status.startedAt ?? null,
      lastRunAt: status.lastRunAt ?? null,
      lastSuccessAt: status.lastSuccessAt ?? null,
      lastErrorAt: status.lastErrorAt ?? null,
      lastErrorMessage: status.lastErrorMessage ?? null,
      nextRunAt: status.nextRunAt ?? null,
      runCount: Number(status.runCount ?? 0),
      failureCount: Number(status.failureCount ?? 0),
      jobs,
      jobCount: Number(status.jobCount ?? jobs.length)
    };
  }

  const jobs = this.#schedulerJobs();

  return {
    started: Boolean(this.schedulerService?.timer),
    running: Boolean(this.schedulerService?.running),
    startedAt: null,
    lastRunAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    nextRunAt: null,
    runCount: 0,
    failureCount: 0,
    jobs,
    jobCount: jobs.length
  };
}

#unavailableSchedulerSummary() {
  return {
    status: 'unavailable',
    started: false,
    running: false,
    startedAt: null,
    lastRunAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    nextRunAt: null,
    runCount: 0,
    failureCount: 0,
    jobs: [],
    jobCount: 0
  };
}


  #schedulerJobs() {
    if (!this.schedulerService?.listJobs) {
      return [];
    }

    return this.schedulerService.listJobs().map((job) => ({ ...job }));
  }

  #countBy(items, keyFn) {
    return items.reduce((counts, item) => {
      const key = keyFn(item);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
  }

  #positiveInteger(value, defaultValue, name) {
    if (value === undefined || value === null || value === '') return defaultValue;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw this.#badRequest(`${name} must be a positive integer`);
    }

    return parsed;
  }

  #assertCredentialManager(operation) {
    if (!this.credentialManager?.[operation]) {
      throw new Error(`DashboardService requires CredentialManager.${operation}()`);
    }
  }

  #assertProviderManager(operation) {
    if (!this.providerManager?.[operation]) {
      throw new Error(`DashboardService requires ProviderManager.${operation}()`);
    }
  }

  #badRequest(message) {
    const error = new Error(message);
    error.statusCode = 400;
    error.code = 'BAD_REQUEST';
    return error;
  }

  #toJSON(value) {
    if (value && typeof value.toJSON === 'function') {
      return value.toJSON();
    }

    return value;
  }

  #toProviderJSON(providerSummary) {
    const key = providerSummary.key ?? providerSummary.providerKey ?? providerSummary.name;

    return {
      providerKey: key,
      key,
      displayName: providerSummary.displayName ?? key,
      description: providerSummary.description ?? null,
      capabilities: providerSummary.capabilities?.toArray?.() ?? providerSummary.capabilities ?? []
    };
  }
}
