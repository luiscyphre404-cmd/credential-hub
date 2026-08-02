import { Command } from './command.js';

export class RefreshExpiredTokensCommand extends Command {
  constructor({ credentialManager }) {
    super();
    this.credentialManager = credentialManager;
  }

  async execute() {
    return this.credentialManager.refreshExpiredCredentials();
  }
}
