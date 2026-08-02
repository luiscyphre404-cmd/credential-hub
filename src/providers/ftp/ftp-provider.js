import { Provider } from '../provider.js';
import { ProviderResult } from '../../models/provider-result.js';

export class FtpProvider extends Provider {
  constructor({ connectionService }) {
    super();

    if (!connectionService) {
      throw new Error('FtpProvider requires connectionService');
    }

    this.connectionService = connectionService;
  }

  async validateCredential(credential) {
    try {
      const validation = await this.connectionService.validateCredential(credential);
      return ProviderResult.success(validation);
    } catch (error) {
      return ProviderResult.failure(error);
    }
  }

  async healthCheck(credential) {
    try {
      const health = await this.connectionService.healthCheck(credential);

      if (!health.healthy) {
        return ProviderResult.failure(new Error(health.message ?? 'FTP health check failed'));
      }

      return ProviderResult.success(health);
    } catch (error) {
      return ProviderResult.failure(error);
    }
  }
}
