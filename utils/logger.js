/**
 * Unified logging module
 * Provides unified logging functionality
 */

const config = require("../config");

// Log level enumeration
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Current log level (from config or environment variable)
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;

/**
 * Log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} meta - Metadata (optional)
 */
const log = (level, message, meta = {}) => {
  const logLevel = LOG_LEVELS[level];
  
  // Skip if current level is lower than the logging level
  if (logLevel > currentLogLevel) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  };

  // Select output stream based on level
  if (level === 'ERROR' || level === 'WARN') {
    console.error(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
};

/**
 * Log info message
 * @param {string} message - Log message
 * @param {Object} meta - Metadata (optional)
 */
const info = (message, meta) => {
  log('INFO', message, meta);
};

/**
 * Log warning message
 * @param {string} message - Log message
 * @param {Object} meta - Metadata (optional)
 */
const warn = (message, meta) => {
  log('WARN', message, meta);
};

/**
 * Log error message
 * @param {string} message - Log message
 * @param {Object} meta - Metadata (optional)
 */
const error = (message, meta) => {
  log('ERROR', message, meta);
};

/**
 * Log debug message
 * @param {string} message - Log message
 * @param {Object} meta - Metadata (optional)
 */
const debug = (message, meta) => {
  log('DEBUG', message, meta);
};

// Define a logger object
const logger = {
  info,
  warn,
  error,
  debug,
  LOG_LEVELS,
};

module.exports = {
  info,
  warn,
  error,
  debug,
  LOG_LEVELS,
  logger,
};
