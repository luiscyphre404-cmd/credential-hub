export class Provider {

  getAuthorizationUrl() {
    throw new Error('getAuthorizationUrl() must be implemented');
  }

  async authenticate() {
    throw new Error('authenticate() must be implemented');
  }

  async refresh() {
    throw new Error('refresh() must be implemented');
  }

  async healthCheck() {
    throw new Error('healthCheck() must be implemented');
  }

}
