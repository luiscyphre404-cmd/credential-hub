class CommandDispatcher {

    constructor() {
        this.commands = new Map();
    }

    register(command) {

        if (!command || !command.name) {
            throw new Error('Invalid command');
        }

        this.commands.set(command.name, command);

    }

    get(name) {
        return this.commands.get(name);
    }

    async execute(name, ...args) {

        const command = this.get(name);

        if (!command) {
            throw new Error(`Unknown command: ${name}`);
        }

        return await command.execute(...args);

    }

    list() {
        return [...this.commands.keys()];
    }

}

module.exports = CommandDispatcher;
