import { Command } from './command.js';

export class StartOAuthCommand extends Command {
  constructor({ providerManager }) {
    super();

    this.providerManager = providerManager;
  }

  async execute({
    provider,
    account = null,
    scopes = null,
    state = null
  }) {
    if (!provider) {
      throw new Error('provider is required');
    }

    const options = {
      account,
      state
    };

    if (Array.isArray(scopes) && scopes.length > 0) {
      options.scopes = scopes;
    }

    return this.providerManager.startOAuth(provider, options);
  }
}
