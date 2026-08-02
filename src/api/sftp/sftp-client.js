export class SftpClient {
  constructor({ connector = null, timeoutMs = 10000 } = {}) {
    this.connector = connector;
    this.timeoutMs = timeoutMs;
  }

  async testConnection(connectionOptions = {}) {
    this.#validateConnectionOptions(connectionOptions);

    if (!this.connector) {
      throw new Error('SFTP transport adapter is not configured');
    }

    let session = null;

    try {
      // Connect to the policy-pinned address while preserving the original host
      // for SSH host-key connector implementations.
      const connectorOptions = {
        ...connectionOptions,
        hostKeyAlias: connectionOptions.verificationHost ?? connectionOptions.host
      };
      session = await this.#withTimeout(
        this.connector.connect(connectorOptions),
        connectionOptions.timeoutMs ?? this.timeoutMs
      );

      if (session?.disconnect) {
        await session.disconnect();
      }

      return {
        connected: true,
        host: connectionOptions.host,
        port: connectionOptions.port
      };
    } catch (error) {
      if (session?.disconnect) {
        try {
          await session.disconnect();
        } catch {
          // Ignore disconnect errors while reporting the original connection failure.
        }
      }

      throw error;
    }
  }

  #validateConnectionOptions({ host, port, username, password }) {
    if (!host) throw new Error('SFTP host is required');
    if (!port) throw new Error('SFTP port is required');
    if (!username) throw new Error('SFTP username is required');
    if (!password) throw new Error('SFTP password is required');
  }

  async #withTimeout(promise, timeoutMs) {
    let timeoutHandle;

    const timeout = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`SFTP connection timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}
