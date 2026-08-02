import { oauthConfigurationValue } from '../../oauth/oauth-provider-configuration.js';

export class ThreadsApiClient {
  constructor({ httpClient, config }) {
    this.httpClient = httpClient;
    this.config = config;

    this.baseUrl = 'https://graph.threads.net';
    this.apiVersion = 'v1.0';
  }

  async exchangeCodeForToken({ code, redirectUri, providerConfiguration = null }) {
    const body = new URLSearchParams({
      client_id: oauthConfigurationValue({ providerConfiguration, field: 'clientId', config: this.config, environmentKey: 'THREADS_CLIENT_ID' }),
      client_secret: oauthConfigurationValue({ providerConfiguration, field: 'clientSecret', config: this.config, environmentKey: 'THREADS_CLIENT_SECRET' }),
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code
    });

    const response = await this.httpClient.post(
      `${this.baseUrl}/oauth/access_token`,
      body,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data;
  }

  async exchangeForLongLivedToken({ shortLivedToken, providerConfiguration = null }) {
    const response = await this.httpClient.get(
      `${this.baseUrl}/access_token`,
      {
        query: {
          grant_type: 'th_exchange_token',
          client_secret: oauthConfigurationValue({ providerConfiguration, field: 'clientSecret', config: this.config, environmentKey: 'THREADS_CLIENT_SECRET' }),
          access_token: shortLivedToken
        }
      }
    );

    return response.data;
  }

  async refreshLongLivedToken({ accessToken }) {
    const response = await this.httpClient.get(
      `${this.baseUrl}/refresh_access_token`,
      {
        query: {
          grant_type: 'th_refresh_token',
          access_token: accessToken
        }
      }
    );

    return response.data;
  }

  async getCurrentUser({ accessToken }) {
    const response = await this.httpClient.get(
      `${this.baseUrl}/${this.apiVersion}/me`,
      {
        query: {
          fields: 'id,username',
          access_token: accessToken
        }
      }
    );

    return response.data;
  }
}
