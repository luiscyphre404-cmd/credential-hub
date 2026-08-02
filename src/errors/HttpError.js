class HttpError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'HttpError';
        this.details = details;
    }
}

module.exports = HttpError;
