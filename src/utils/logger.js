class Logger {
    info(message, data = null) {
        console.log(`[INFO] ${new Date().toISOString()} ${message}`, data ?? '');
    }

    warn(message, data = null) {
        console.warn(`[WARN] ${new Date().toISOString()} ${message}`, data ?? '');
    }

    error(message, data = null) {
        console.error(`[ERROR] ${new Date().toISOString()} ${message}`, data ?? '');
    }
}

module.exports = new Logger();
