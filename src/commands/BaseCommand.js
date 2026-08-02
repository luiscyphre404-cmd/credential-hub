const OperationResult = require('../models/OperationResult');

class BaseCommand {
    constructor(name) {
        if (!name) {
            throw new Error('Command name is required');
        }
        this.name = name;
    }

    async execute() {
        throw new Error(`execute() not implemented for command: ${this.name}`);
    }

    success(operation, data = null, metadata = {}, provider = null) {
        return OperationResult.success({
            provider,
            operation,
            data,
            metadata
        });
    }

    failure(operation, error, metadata = {}, provider = null) {
        return OperationResult.failure({
            provider,
            operation,
            error,
            metadata
        });
    }
}

module.exports = BaseCommand;
