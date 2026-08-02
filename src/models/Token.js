class Token {

    constructor({
        provider,
        accessToken,
        expiresAt,
        refreshedAt = null,
        status = 'valid',
        metadata = {}
    }) {
        if (!provider) throw new Error('Token provider is required');
        if (!accessToken) throw new Error('Token accessToken is required');
        if (!expiresAt) throw new Error('Token expiresAt is required');

        this.provider = provider;
        this.accessToken = accessToken;
        this.expiresAt = new Date(expiresAt);
        this.refreshedAt = refreshedAt ? new Date(refreshedAt) : new Date();
        this.status = status;
        this.metadata = metadata;
    }

    isExpired() {
        return this.expiresAt.getTime() <= Date.now();
    }

    daysUntilExpiration() {
        const diffMs = this.expiresAt.getTime() - Date.now();
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    shouldRefresh(refreshBeforeDays) {
        return this.daysUntilExpiration() <= refreshBeforeDays;
    }

    toStorageObject() {
        return {
            provider: this.provider,
            access_token: this.accessToken,
            expires_at: this.expiresAt.toISOString(),
            refreshed_at: this.refreshedAt.toISOString(),
            status: this.status,
            metadata: JSON.stringify(this.metadata || {})
        };
    }

    static fromStorageObject(data) {
        if (!data || !data.access_token) {
            return null;
        }

        return new Token({
            provider: data.provider,
            accessToken: data.access_token,
            expiresAt: data.expires_at,
            refreshedAt: data.refreshed_at,
            status: data.status || 'valid',
            metadata: data.metadata ? JSON.parse(data.metadata) : {}
        });
    }
}

module.exports = Token;
