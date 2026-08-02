import { ProviderCapability } from '../models/provider-capability.js';

export class ProviderRotationFramework {
  constructor({
    credentialManager,
    providerManager,
    auditLogService = null,
    lifecycleNotificationService = null
  } = {}) {
    this.credentialManager = credentialManager;
    this.providerManager = providerManager;
    this.auditLogService = auditLogService;
    this.lifecycleNotificationService = lifecycleNotificationService;
  }

  async rotateCredential(item, context = {}) {
    this.#assertDependencies('rotateCredential');

    const credential = await this.#resolveCredential(item.credentialId);
    const providerKey = item.providerKey ?? credential.providerKey;
    const capabilityCheck = this.#rotationCapability(providerKey);

    if (!capabilityCheck.supported) {
      await this.#recordAudit('provider-rotation.skipped', item, context, 'skipped', {
        providerKey,
        reason: capabilityCheck.reason
      });
      await this.#recordNotification({ ...item, providerKey, skipped: true, reason: capabilityCheck.reason }, context);
      return {
        credentialId: item.credentialId,
        providerKey,
        success: false,
        skipped: true,
        reason: capabilityCheck.reason,
        findings: item.findings ?? []
      };
    }

    await this.#recordAudit('provider-rotation.started', item, context, 'success', { providerKey });

    const result = await this.credentialManager.refresh(item.credentialId);
    const rotatedCredential = this.#normalizeRotationResult(result);

    await this.#recordAudit('provider-rotation.completed', item, context, 'success', { providerKey });

    return {
      credentialId: item.credentialId,
      providerKey,
      success: true,
      skipped: false,
      findings: item.findings ?? [],
      credential: this.#toJSON(rotatedCredential),
      providerCapabilities: capabilityCheck.capabilities
    };
  }

  summarize(results = []) {
    const succeeded = results.filter((result) => result.success).length;
    const skipped = results.filter((result) => result.skipped).length;
    const failed = results.length - succeeded - skipped;

    return {
      requested: results.length,
      succeeded,
      failed,
      skipped,
      results
    };
  }

  #rotationCapability(providerKey) {
    if (!providerKey) {
      return { supported: false, reason: 'provider-missing', capabilities: [] };
    }

    let capabilities;

    try {
      capabilities = this.providerManager.getProviderCapabilities(providerKey) ?? [];
    } catch (error) {
      return {
        supported: false,
        reason: error.code === 'NOT_FOUND' ? 'provider-not-found' : 'provider-capability-check-failed',
        capabilities: []
      };
    }

    const normalizedCapabilities = Array.isArray(capabilities) ? capabilities : [];
    const supported = normalizedCapabilities.includes(ProviderCapability.REFRESH);

    return {
      supported,
      reason: supported ? null : 'provider-refresh-not-supported',
      capabilities: normalizedCapabilities
    };
  }

  async #resolveCredential(credentialId) {
    if (!this.credentialManager?.getCredential) {
      return { credentialId, providerKey: null };
    }

    return this.credentialManager.getCredential(credentialId);
  }

  #normalizeRotationResult(result) {
    if (typeof result?.success === 'boolean') {
      if (!result.success) {
        const error = new Error(result.error?.message ?? 'Provider rotation failed');
        error.code = result.error?.code ?? result.error?.name ?? 'PROVIDER_ROTATION_FAILED';
        throw error;
      }

      return result.data?.credential ?? result.data;
    }

    return result?.credential ?? result;
  }

  async #recordAudit(action, item, context = {}, result = 'success', details = {}) {
    if (!this.auditLogService?.record) return;

    await this.auditLogService.record({
      userId: context.userId,
      roleKey: context.roleKey,
      action,
      targetType: 'credential',
      targetId: item.credentialId,
      result,
      details: {
        providerKey: item.providerKey ?? details.providerKey ?? null,
        findings: item.findings ?? [],
        ...details
      }
    });
  }

  async #recordNotification(result, context = {}) {
    if (!this.lifecycleNotificationService?.createForRotationResult) return;
    await this.lifecycleNotificationService.createForRotationResult(result, context);
  }

  #assertDependencies(operation) {
    if (!this.credentialManager?.refresh) {
      throw new Error(`ProviderRotationFramework.${operation}() requires credentialManager with refresh`);
    }

    if (!this.providerManager?.getProviderCapabilities) {
      throw new Error(`ProviderRotationFramework.${operation}() requires providerManager with getProviderCapabilities`);
    }
  }

  #toJSON(value) {
    return typeof value?.toJSON === 'function' ? value.toJSON() : value;
  }
}
