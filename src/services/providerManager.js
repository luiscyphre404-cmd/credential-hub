class ProviderManager {

    constructor() {
        this.providers = new Map();
    }

    register(provider) {
        if (!provider || !provider.name) {
            throw new Error('Provider must have a name');
        }

        if (this.providers.has(provider.name)) {
            throw new Error(`Provider already registered: ${provider.name}`);
        }

        this.providers.set(provider.name, provider);
    }

    getProvider(name) {
        return this.providers.get(name) || null;
    }

    listProviders() {
        return Array.from(this.providers.keys());
    }

    async refreshProvider(name, context) {
        const provider = this.getProvider(name);

        if (!provider) {
            throw new Error(`Provider not found: ${name}`);
        }

        if (typeof provider.refresh !== 'function') {
            throw new Error(`Provider has no refresh method: ${name}`);
        }

        return await provider.refresh(context);
    }

    async refreshAll(context) {
        const results = [];

        for (const [name, provider] of this.providers.entries()) {
            try {
                const result = await provider.refresh(context);
                results.push({
                    provider: name,
                    success: true,
                    result
                });
            } catch (err) {
                results.push({
                    provider: name,
                    success: false,
                    error: err.message
                });
            }
        }

        return results;
    }
}

module.exports = ProviderManager;
