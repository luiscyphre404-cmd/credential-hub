import { Provider } from '../provider.js';
import { ProviderResult } from '../../models/provider-result.js';

export class ThreadsProvider extends Provider {
  constructor({ oauthService }) {
    super();

    if (!oauthService) {
      throw new Error('ThreadsProvider requires oauthService');
    }

    this.oauthService = oauthService;
  }

  startOAuth(options = {}) {
    try {
      const authorizationUrl = this.oauthService.getAuthorizationUrl(options);

      return ProviderResult.success({ authorizationUrl });
    } catch (error) {
      return ProviderResult.failure(error);
    }
  }

  async handleOAuthCallback(callbackData = {}) {
    if (!callbackData.code) {
      return ProviderResult.failure(
        new Error('OAuth callback code is required')
      );
    }

    try {
      const oauthResult = await this.oauthService.authenticate(callbackData);

      return ProviderResult.success(oauthResult);
    } catch (error) {
      return ProviderResult.failure(error);
    }
  }

  async refreshToken(tokenRecord) {
    if (!tokenRecord?.accessToken) {
      return ProviderResult.failure(
        new Error('Credential with accessToken is required')
      );
    }

    try {
      const oauthResult = await this.oauthService.refresh({
        accessToken: tokenRecord.accessToken,
        providerConfiguration: tokenRecord.providerConfiguration ?? null
      });

      return ProviderResult.success(oauthResult);
    } catch (error) {
      return ProviderResult.failure(error);
    }
  }

  async healthCheck(tokenRecord) {
    if (!tokenRecord?.accessToken) {
      return ProviderResult.failure(
        new Error('Credential with accessToken is required')
      );
    }

    try {
      const healthResult = await this.oauthService.healthCheck({
        accessToken: tokenRecord.accessToken
      });

      return ProviderResult.success(healthResult);
    } catch (error) {
      return ProviderResult.failure(error);
    }
  }
}
