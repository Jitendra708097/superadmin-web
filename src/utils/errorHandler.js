/**
 * @module errorHandler
 * @description Parses API error responses into human-readable messages.
 *              Handles Axios errors, RTK Query errors, and network failures.
 *              Enhanced 2026-04-14: Added error logging, recovery suggestions,
 *              and semantic error categorization.
 */

// Error log storage (session-scoped)
const ERROR_LOG = [];
const MAX_ERROR_LOG_SIZE = 100;

/**
 * Extract a user-facing error message from any error shape
 * @param {unknown} error
 * @returns {string}
 */
export function parseError(error) {
  if (!error) return 'An unexpected error occurred.';

  // RTK Query error shape
  if (error.data) {
    return (
      error.data?.error?.message ||
      error.data?.message ||
      'Request failed.'
    );
  }

  // Axios error shape
  if (error.response) {
    const data = error.response.data;
    return (
      data?.error?.message ||
      data?.message ||
      `Server error (${error.response.status})`
    );
  }

  // Network error
  if (error.request) {
    return 'Network error — check your connection.';
  }

  // Plain Error
  if (error.message) return error.message;

  return 'An unexpected error occurred.';
}

/**
 * Get the error code from an API error
 * @param {unknown} error
 * @returns {string|null}
 */
export function getErrorCode(error) {
  return (
    error?.data?.error?.code ||
    error?.response?.data?.error?.code ||
    null
  );
}

/**
 * Check if error is an authentication error (401)
 */
export function isAuthError(error) {
  return (
    error?.status === 401 ||
    error?.response?.status === 401
  );
}

/**
 * Check if error is a permission error (403)
 */
export function isPermissionError(error) {
  return (
    error?.status === 403 ||
    error?.response?.status === 403
  );
}

/**
 * Check if error is a server error (5xx)
 */
export function isServerError(error) {
  const status = error?.status || error?.response?.status;
  return status >= 500 && status < 600;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error) {
  return !error?.status && !error?.response?.status;
}

/**
 * Format RTK Query error for display in Ant Design message/notification
 */
export function formatRtkError(error) {
  const message = parseError(error);
  const code = getErrorCode(error);
  return code ? `[${code}] ${message}` : message;
}

/**
 * Logs an error for debugging
 * @param {unknown} error - Error object
 * @param {Object} context - Context {action, component, url, timestamp}
 */
export function logError(error, context = {}) {
  const timestamp = new Date().toISOString();
  const code = getErrorCode(error);
  const message = parseError(error);
  const status = error?.status || error?.response?.status;

  const logEntry = {
    timestamp,
    code: code || 'UNKNOWN',
    message,
    status,
    errorType: classifyError(error),
    ...context,
  };

  ERROR_LOG.push(logEntry);
  
  // Keep log size manageable
  if (ERROR_LOG.length > MAX_ERROR_LOG_SIZE) {
    ERROR_LOG.shift();
  }

  // Log to console in development
  console.error(`[${logEntry.code}] ${message}`, {
    status,
    errorType: logEntry.errorType,
    context,
  });
}

/**
 * Gets the error log
 * @returns {Array} Array of error log entries
 */
export function getErrorLog() {
  return ERROR_LOG.slice();
}

/**
 * Clears the error log
 */
export function clearErrorLog() {
  ERROR_LOG.length = 0;
}

/**
 * Classifies error type for categorization
 * @param {unknown} error
 * @returns {string} 'auth' | 'permission' | 'server' | 'network' | 'client' | 'unknown'
 */
export function classifyError(error) {
  if (isAuthError(error)) return 'auth';
  if (isPermissionError(error)) return 'permission';
  if (isServerError(error)) return 'server';
  if (isNetworkError(error)) return 'network';
  
  const status = error?.status || error?.response?.status;
  if (status >= 400 && status < 500) return 'client';
  
  return 'unknown';
}

/**
 * Suggests error recovery action
 * @param {unknown} error
 * @returns {Object} {action: string, icon: string, description: string}
 */
export function getErrorRecovery(error) {
  const errorType = classifyError(error);

  const recoveryMap = {
    auth: {
      action: 'redirect-login',
      icon: 'lock',
      description: 'Your session has expired. Please log in again.',
    },
    permission: {
      action: 'contact-admin',
      icon: 'alert',
      description: 'You do not have permission for this action. Contact your administrator.',
    },
    server: {
      action: 'retry',
      icon: 'reload',
      description: 'The server is experiencing issues. Please try again.',
    },
    network: {
      action: 'check-connection',
      icon: 'warning',
      description: 'Network error. Please check your internet connection.',
    },
    client: {
      action: 'dismiss',
      icon: 'close',
      description: 'Request error. Please review and try again.',
    },
    unknown: {
      action: 'dismiss',
      icon: 'info',
      description: 'An unexpected error occurred. Please try again.',
    },
  };

  return recoveryMap[errorType] || recoveryMap.unknown;
}
