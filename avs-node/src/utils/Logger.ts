/**
 * Simple logging utility for AVS Node
 */

export interface LoggerConfig {
  level: "debug" | "info" | "warn" | "error";
  file?: string;
}

export class Logger {
  private config: LoggerConfig;
  private logLevels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  debug(message: string, meta?: any): void {
    this.log("debug", message, meta);
  }

  info(message: string, meta?: any): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log("warn", message, meta);
  }

  error(message: string, error?: any): void {
    if (error instanceof Error) {
      this.log("error", message, {
        errorMessage: error.message,
        stack: error.stack,
      });
    } else {
      this.log("error", message, error);
    }
  }

  private log(level: keyof typeof this.logLevels, message: string, meta?: any): void {
    if (this.logLevels[level] < this.logLevels[this.config.level]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const formattedLevel = level.toUpperCase().padEnd(5);

    let logMessage = `[${timestamp}] ${formattedLevel} ${message}`;

    if (meta) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }

    // For MVP, just console log
    // In production, this would write to files, send to logging services, etc.
    switch (level) {
      case "debug":
        console.debug(logMessage);
        break;
      case "info":
        console.info(logMessage);
        break;
      case "warn":
        console.warn(logMessage);
        break;
      case "error":
        console.error(logMessage);
        break;
    }

    // If file logging is configured, write to file
    // This would be implemented in production
    if (this.config.file) {
      // TODO: Implement file logging
    }
  }
}
