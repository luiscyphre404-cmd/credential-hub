import { Provider } from '../provider.js';
import { ProviderResult } from '../../models/provider-result.js';

export class KickProvider extends Provider {
  constructor({ oauthService }) {
    super();

    if (!oauthService) {
      throw new Error('KickProvider requires oauthService');
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

  async refreshToken(credential) {
    if (!credential?.refreshToken) {
      return ProviderResult.failure(
        new Error('Credential with refreshToken is required')
      );
    }

    try {
      const oauthResult = await this.oauthService.refresh({
        refreshToken: credential.refreshToken,
        providerConfiguration: credential.providerConfiguration ?? null
      });

      return ProviderResult.success(oauthResult);
    } catch (error) {
      return ProviderResult.failure(error);
    }
  }

  async healthCheck(credential) {
    if (!credential?.accessToken) {
      return ProviderResult.failure(
        new Error('Credential with accessToken is required')
      );
    }

    try {
      const healthResult = await this.oauthService.healthCheck({
        accessToken: credential.accessToken
      });

      return ProviderResult.success(healthResult);
    } catch (error) {
      return ProviderResult.failure(error);
    }
  }
}
