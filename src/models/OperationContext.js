const crypto = require('crypto');

class OperationContext {

    constructor({
        source = 'manual',
        dryRun = false,
        force = false,
        operationId = null,
        metadata = {}
    } = {}) {

        this.source = source;
        this.dryRun = dryRun;
        this.force = force;
        this.operationId = operationId || crypto.randomUUID();
        this.metadata = metadata;
        this.startedAt = new Date();

    }

    isDryRun() {
        return this.dryRun;
    }

    isForced() {
        return this.force;
    }

    getOperationId() {
        return this.operationId;
    }

    getSource() {
        return this.source;
    }

    getMetadata() {
        return this.metadata;
    }

}

module.exports = OperationContext;
