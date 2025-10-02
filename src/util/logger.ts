/**
 * Simple logger utility for consistent logging across the application
 */
export class Logger {
  private static formatMessage(level: string, message: string, extra?: any): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] ${level}: ${message}`;
    
    if (extra) {
      return `${baseMessage}\n${JSON.stringify(extra, null, 2)}`;
    }
    
    return baseMessage;
  }

  static info(message: string, extra?: any): void {
    console.log(this.formatMessage('INFO', message, extra));
  }

  static warn(message: string, extra?: any): void {
    console.warn(this.formatMessage('WARN', message, extra));
  }

  static error(message: string, error?: Error | any, extra?: any): void {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    
    const logExtra = extra ? { ...extra, error: errorDetails } : { error: errorDetails };
    console.error(this.formatMessage('ERROR', message, logExtra));
  }

  static success(message: string, extra?: any): void {
    console.log(this.formatMessage('✅ SUCCESS', message, extra));
  }

  static debug(message: string, extra?: any): void {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, extra));
    }
  }
}