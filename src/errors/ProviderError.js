class ProviderError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'ProviderError';
        this.details = details;
    }
}

module.exports = ProviderError;
