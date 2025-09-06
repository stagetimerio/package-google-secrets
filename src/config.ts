/**
 * Configuration module for Google Secrets
 * Defines configuration options and reads them from environment variables
 */

/**
 * Configuration options for Google Secrets
 */
export interface GoogleSecretsConfig {
  /** List of secret names to load */
  secretKeys: string[] | undefined
  /** Path to JSON file with secret names */
  secretKeysFile: string | undefined
  /** Override existing env variables (default: false, preserves existing) */
  overrideExisting: boolean
  /** Print debug information */
  debug: boolean
  /** Timeout for loading secrets in milliseconds */
  timeout: number | undefined
  /** Whether to search for config files in directory tree */
  autoDiscoverConfig: boolean
  /** Prefix to add to all environment variable names */
  prefix: string | undefined
}

/**
 * Default configuration values
 */
const defaultConfig: GoogleSecretsConfig = {
  secretKeys: undefined,
  secretKeysFile: undefined,
  overrideExisting: false,
  debug: false,
  timeout: 5000,
  autoDiscoverConfig: true,
  prefix: undefined
}

/**
 * Gets configuration from environment variables
 */
export function getConfigFromEnv (): GoogleSecretsConfig {
  const config: GoogleSecretsConfig = { ...defaultConfig }

  // Parse secret keys from comma-separated string
  if (process.env.GOOGLE_SECRETS_KEYS) {
    config.secretKeys = process.env.GOOGLE_SECRETS_KEYS.split(',').map(key => key.trim()).filter(Boolean)
  }

  // Get path to secrets file
  config.secretKeysFile = process.env.GOOGLE_SECRETS_KEYS_FILE

  // Parse boolean for overriding existing env vars
  if (process.env.GOOGLE_SECRETS_OVERRIDE_EXISTING !== undefined) {
    config.overrideExisting = process.env.GOOGLE_SECRETS_OVERRIDE_EXISTING.toLowerCase() === 'true'
  }

  // Parse boolean for debug mode
  if (process.env.GOOGLE_SECRETS_DEBUG !== undefined) {
    config.debug = process.env.GOOGLE_SECRETS_DEBUG.toLowerCase() === 'true'
  }

  // Parse timeout value
  if (process.env.GOOGLE_SECRETS_TIMEOUT) {
    const timeout = parseInt(process.env.GOOGLE_SECRETS_TIMEOUT, 10)
    if (!isNaN(timeout)) {
      config.timeout = timeout
    }
  }

  // Parse autoDiscoverConfig flag
  if (process.env.GOOGLE_SECRETS_AUTO_DISCOVER !== undefined) {
    config.autoDiscoverConfig = process.env.GOOGLE_SECRETS_AUTO_DISCOVER.toLowerCase() !== 'false'
  }

  // Get prefix from environment
  config.prefix = process.env.GOOGLE_SECRETS_PREFIX

  return config
}

/**
 * Merges user-provided options with environment config
 */
export function mergeConfig (options: Partial<GoogleSecretsConfig>): GoogleSecretsConfig {
  const envConfig = getConfigFromEnv()
  return {
    ...envConfig,
    ...options,
  }
}
