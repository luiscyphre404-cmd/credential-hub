class BaseProvider {
    constructor(name) {
        if (!name) {
            throw new Error('Provider name is required');
        }

        this.name = name;
    }

    async refresh() {
        throw new Error(`refresh() not implemented for provider: ${this.name}`);
    }
}

module.exports = BaseProvider;
