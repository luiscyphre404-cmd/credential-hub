class StorageError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'StorageError';
        this.details = details;
    }
}

module.exports = StorageError;
