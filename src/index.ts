/**
 * Main entry point for programmatic usage
 */
import { type GoogleSecretsConfig, mergeConfig } from './config.js'
import { SecretManager, type LoadedSecrets } from './SecretManager.js'
import { withTimeout } from './utils.js'
import * as logger from './logger.js'

/**
 * Loads secrets from Google Cloud Secret Manager and sets them as environment variables
 */
export async function loadSecrets (options: Partial<GoogleSecretsConfig> = {}): Promise<LoadedSecrets> {
  // Merge provided options with environment config
  const config = mergeConfig(options)
  logger.init(config)

  try {
    // Create SecretManager instance
    const secretManager = new SecretManager(config)

    // Apply timeout if specified
    if (config.timeout) {
      logger.debug(`Setting timeout for secret loading: ${config.timeout}ms`)
      const secrets = await withTimeout(
        secretManager.loadSecrets(),
        config.timeout,
        `Secret loading timed out after ${config.timeout}ms`
      )
      logger.info(`Loaded ${Object.keys(secrets).length} secrets: ${Object.keys(secrets).join(', ')}`)
    }

    // Load secrets without timeout
    return await secretManager.loadSecrets()
  } catch (error) {
    logger.error(`Error loading secrets: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

// Re-export types
export { GoogleSecretsConfig, LoadedSecrets }
