import { Provider } from '../provider.js';
import { ProviderResult } from '../../models/provider-result.js';

export class SftpProvider extends Provider {
  constructor({ connectionService }) {
    super();

    if (!connectionService) {
      throw new Error('SftpProvider requires connectionService');
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
        return ProviderResult.failure(new Error(health.message ?? 'SFTP health check failed'));
      }

      return ProviderResult.success(health);
    } catch (error) {
      return ProviderResult.failure(error);
    }
  }
}
