class OperationResult {
    constructor({
        success,
        provider = null,
        operation = null,
        data = null,
        error = null,
        metadata = {}
    }) {
        this.success = success;
        this.provider = provider;
        this.operation = operation;
        this.data = data;
        this.error = error;
        this.metadata = metadata;
        this.createdAt = new Date();
    }

    static success({ provider = null, operation = null, data = null, metadata = {} } = {}) {
        return new OperationResult({
            success: true,
            provider,
            operation,
            data,
            metadata
        });
    }

    static failure({ provider = null, operation = null, error, metadata = {} } = {}) {
        return new OperationResult({
            success: false,
            provider,
            operation,
            error: error instanceof Error ? error.message : String(error),
            metadata
        });
    }
}

module.exports = OperationResult;
