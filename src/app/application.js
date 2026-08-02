export class Application {
  constructor({
    config,
    logger,
    container,
    providerRegistry,
    oauthManager,
    providerManager,
    credentialManager,
    schedulerService,
    refreshExpiredTokensCommand,
    oauthCallbackServer
  }) {
    this.config = config;
    this.logger = logger;
    this.container = container;
    this.providerRegistry = providerRegistry;
    this.oauthManager = oauthManager;
    this.providerManager = providerManager;
    this.credentialManager = credentialManager;
    this.schedulerService = schedulerService;
    this.refreshExpiredTokensCommand = refreshExpiredTokensCommand;
    this.oauthCallbackServer = oauthCallbackServer;
  }

  async start() {
    const migratedCredentialIds = await this.credentialManager.migrateLegacyCredentialMethods();
    if (migratedCredentialIds.length > 0) {
      this.logger.info(`Migrated credential methods: ${migratedCredentialIds.length}`);
    }
    await this.oauthCallbackServer.start();

    await this.schedulerService.start();

    this.logger.success('Application started');
    this.logger.info(`Registered providers: ${this.providerRegistry.count()}`);
    this.logger.info(
      `Registered scheduler jobs: ${this.schedulerService.listJobs().length}`
    );
  }

  async stop() {
    this.schedulerService.stop();
    await this.oauthCallbackServer.stop();
    this.logger.info('Application stopped');
  }

  async runRefresh() {
    return this.refreshExpiredTokensCommand.execute();
  }
}
