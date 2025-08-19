import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log levels
const LOG_LEVELS = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG",
};

// Log colors for console output
const LOG_COLORS = {
  ERROR: "\x1b[31m", // Red
  WARN: "\x1b[33m", // Yellow
  INFO: "\x1b[36m", // Cyan
  DEBUG: "\x1b[35m", // Magenta
  RESET: "\x1b[0m", // Reset
};

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
  console.log("📁 Created logs directory");
}

// Get current date for log file name
const getLogFileName = () => {
  const date = new Date();
  return `app-${date.toISOString().split("T")[0]}.log`;
};

// Format log message
const formatLogMessage = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logData = data ? `\nData: ${JSON.stringify(data, null, 2)}` : "";
  const emoji = {
    ERROR: "💥",
    WARN: "⚠️",
    INFO: "ℹ️",
    DEBUG: "🔍",
  }[level];
  return `[${timestamp}] ${emoji} ${level}: ${message}${logData}\n`;
};

// Write log to file
const writeToFile = (message) => {
  const logFile = path.join(logsDir, getLogFileName());
  fs.appendFileSync(logFile, message);
};

// Main logging function
const log = (level, message, data = null) => {
  const formattedMessage = formatLogMessage(level, message, data);

  // Write to file
  writeToFile(formattedMessage);

  // Console output with colors
  console.log(`${LOG_COLORS[level]}${formattedMessage}${LOG_COLORS.RESET}`);
};

// Export logging functions
export const logger = {
  error: (message, data) => log(LOG_LEVELS.ERROR, message, data),
  warn: (message, data) => log(LOG_LEVELS.WARN, message, data),
  info: (message, data) => log(LOG_LEVELS.INFO, message, data),
  debug: (message, data) => log(LOG_LEVELS.DEBUG, message, data),
};
