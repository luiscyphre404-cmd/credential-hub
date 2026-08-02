import { Command } from './command.js';
import { OAuthResult } from '../models/oauth-result.js';

export class ImportTokenCommand extends Command {
  constructor({ credentialManager }) {
    super();
    this.credentialManager = credentialManager;
  }

  async execute(oauthResult) {
    if (!(oauthResult instanceof OAuthResult)) {
      throw new Error(
        'ImportTokenCommand.execute() requires an OAuthResult'
      );
    }

    return this.credentialManager.importCredential(oauthResult);
  }
}
