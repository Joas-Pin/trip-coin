export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

class StructuredLogger {
  private static formatLog(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata,
    };
    console.log(JSON.stringify(logEntry));
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.formatLog(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.formatLog(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.formatLog(LogLevel.WARN, message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.formatLog(LogLevel.ERROR, message, metadata);
  }
}

export const logger = new StructuredLogger();
