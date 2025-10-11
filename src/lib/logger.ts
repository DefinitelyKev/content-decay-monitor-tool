/**
 * Simple logger utility for tracking application flow
 */

type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug'

class Logger {
  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const emoji = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅',
      debug: '🔍',
    }[level]

    let logMessage = `${emoji} [${timestamp}] [${level.toUpperCase()}] ${message}`

    if (data) {
      logMessage += `\n${JSON.stringify(data, null, 2)}`
    }

    return logMessage
  }

  info(message: string, data?: any) {
    console.log(this.formatMessage('info', message, data))
  }

  warn(message: string, data?: any) {
    console.warn(this.formatMessage('warn', message, data))
  }

  error(message: string, error?: any) {
    const errorData = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error
    console.error(this.formatMessage('error', message, errorData))
  }

  success(message: string, data?: any) {
    console.log(this.formatMessage('success', message, data))
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('debug', message, data))
    }
  }

  // Specific domain loggers
  rankCheck(message: string, data?: any) {
    console.log(`🎯 [RANK CHECK] ${message}`, data || '')
  }

  decay(message: string, data?: any) {
    console.log(`📉 [DECAY DETECTION] ${message}`, data || '')
  }

  alert(message: string, data?: any) {
    console.log(`🔔 [ALERT] ${message}`, data || '')
  }

  api(method: string, endpoint: string, status?: number) {
    const statusEmoji = status ? (status < 400 ? '✅' : '❌') : '➡️'
    console.log(`${statusEmoji} [API] ${method} ${endpoint}${status ? ` - ${status}` : ''}`)
  }
}

export const logger = new Logger()
