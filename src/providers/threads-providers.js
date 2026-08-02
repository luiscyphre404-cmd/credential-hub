import { Provider } from '../provider.js';

export class ThreadsProvider extends Provider {

  constructor({ oauthService }) {
    super();
    this.oauthService = oauthService;
  }

  getAuthorizationUrl(options) {
    return this.oauthService.getAuthorizationUrl(options);
  }

  async authenticate(options) {
    return this.oauthService.authenticate(options);
  }

  async refresh(options) {
    return this.oauthService.refresh(options);
  }

  async healthCheck(options) {
    return this.oauthService.healthCheck(options);
  }

}
