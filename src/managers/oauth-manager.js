export class OAuthManager {

  constructor({
    providerRegistry
  }) {
    this.providerRegistry = providerRegistry;
  }

  getAuthorizationUrl(providerName, options = {}) {

    const definition = this.providerRegistry.get(providerName);

    if (!definition?.provider) {
      throw new Error(`Unknown provider: ${providerName}`);
    }

    return definition.provider.getAuthorizationUrl(options);

  }

  async authenticate(providerName, options) {

    const definition = this.providerRegistry.get(providerName);

    if (!definition?.provider) {
      throw new Error(`Unknown provider: ${providerName}`);
    }

    return definition.provider.authenticate(options);

  }

}
