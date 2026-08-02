export class Logger {
  info(message, context = null) {
    this.#write('INFO', message, context);
  }

  success(message, context = null) {
    this.#write('OK', message, context);
  }

  warn(message, context = null) {
    this.#write('WARN', message, context);
  }

  error(message, context = null) {
    this.#write('ERROR', message, context);
  }

  #write(level, message, context) {
    const timestamp = new Date().toISOString();

    if (context) {
      console.log(`[${timestamp}] [${level}] ${message}`, context);
      return;
    }

    console.log(`[${timestamp}] [${level}] ${message}`);
  }
}
