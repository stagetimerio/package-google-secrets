/**
 * Secret Manager module for Google Secrets
 * Interfaces with Google Cloud Secret Manager API
 */
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import type { GoogleSecretsConfig } from './config.js'
import { readSecretKeysFromFile, findConfigFile, parseConfigFile, ConfigFileData } from './utils.js'
import * as logger from './logger.js'

/**
 * Interface for loaded secrets
 * Always includes GOOGLE_PROJECT_ID regardless of other loaded secrets
 */
export interface LoadedSecrets {
  GOOGLE_PROJECT_ID: string
  [key: string]: string
}

/**
 * Secret Manager class for loading secrets from Google Cloud Secret Manager
 */
export class SecretManager {
  private client: SecretManagerServiceClient
  private config: GoogleSecretsConfig

  /**
   * Creates a new Secret Manager instance
   */
  constructor (config: GoogleSecretsConfig) {
    this.config = config
    this.client = new SecretManagerServiceClient()
  }

  /**
   * Loads secrets and sets them as environment variables
   */
  async loadSecrets (): Promise<LoadedSecrets> {
    // Get projectId
    const projectId = await this.client.auth.getProjectId()
    if (!projectId) throw new Error('Project ID is required')
    logger.debug('Project Id: ', projectId)

    const secretKeys = await this.getSecretKeys(projectId)
    const loadedSecrets: LoadedSecrets = {} as LoadedSecrets

    // Add the project ID as an environment variable and to the returned secrets object
    loadedSecrets.GOOGLE_PROJECT_ID = projectId
    process.env.GOOGLE_PROJECT_ID = projectId

    if (!secretKeys || secretKeys.length === 0) {
      logger.debug('No secret keys specified. Skipping secret loading.')
      return loadedSecrets
    }

    logger.debug(`Loading ${secretKeys.length} secrets from project: ${projectId}`)

    // Load all secrets in parallel
    const loadPromises = secretKeys.map(async (secretKey) => {
      try {
        const secretValue = await this.getSecret(projectId!, secretKey)

        // Apply prefix if configured
        const envVarName = this.config.prefix ? `${this.config.prefix}${secretKey}` : secretKey

        // Only set environment variable if it doesn't exist or overrideExisting is true
        if (this.config.overrideExisting || process.env[envVarName] === undefined) {
          process.env[envVarName] = secretValue
          logger.debug(`Loaded secret: ${secretKey} -> ${envVarName}`)
        } else {
          logger.debug(`Skipped existing environment variable: ${envVarName}`)
        }

        loadedSecrets[envVarName] = secretValue
      } catch (error) {
        logger.error(`Error loading secret ${secretKey}: ${error instanceof Error ? error.message : String(error)}`)
      }
    })

    await Promise.all(loadPromises)

    logger.debug('All secrets loaded')
    return loadedSecrets
  }

  /**
   * Gets a specific secret value from Secret Manager
   */
  private async getSecret (projectId: string, secretName: string): Promise<string> {
    // Format the resource name
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`

    try {
      // Access the secret version
      const [version] = await this.client.accessSecretVersion({ name })

      // Extract payload data
      if (!version.payload?.data) {
        throw new Error(`Secret ${secretName} has no data`)
      }

      return version.payload.data.toString()
    } catch (error) {
      logger.error(`Error accessing secret ${secretName}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * Updates config with settings from a config file if they haven't been set via environment/options
   */
  private updateConfigFromFile (fileData: ConfigFileData, source: string): void {
    // If file has a prefix and no prefix was set via environment/options, use the file's prefix
    if (fileData.prefix && !this.config.prefix) {
      this.config.prefix = fileData.prefix
      logger.debug(`Using prefix from ${source}: ${fileData.prefix}`)
    }
    
    // If file has overrideExisting and it wasn't set via environment/options, use the file's setting
    if (fileData.overrideExisting !== undefined && 
        !process.env.GOOGLE_SECRETS_OVERRIDE_EXISTING && 
        this.config.overrideExisting === false) {
      this.config.overrideExisting = fileData.overrideExisting
      logger.debug(`Using overrideExisting from ${source}: ${fileData.overrideExisting}`)
    }
  }

  /**
   * Gets the list of secret keys to load
   */
  private async getSecretKeys (projectId: string): Promise<string[]> {
    // Priority 1: Use keys from config if provided
    if (this.config.secretKeys && this.config.secretKeys.length > 0) {
      logger.debug('Using secretKeys from environment variables or options')
      return this.config.secretKeys
    }

    // Priority 2: Read keys from explicitly specified file if provided
    if (this.config.secretKeysFile) {
      logger.debug(`Using secretKeysFile from environment: ${this.config.secretKeysFile}`)
      const fileData = await readSecretKeysFromFile(this.config.secretKeysFile)
      this.updateConfigFromFile(fileData, 'secrets file')
      return fileData.secrets
    }

    // Priority 3: Auto-discover config file if enabled
    if (this.config.autoDiscoverConfig) {
      const configFilePath = await findConfigFile()
      if (configFilePath) {
        const configData = await parseConfigFile(configFilePath)
        if (configData.secrets && configData.secrets.length > 0) {
          logger.debug(`Using auto-discovered config file: ${configFilePath}`)
          this.updateConfigFromFile(configData, 'config file')
          return configData.secrets
        }
      }
    }

    // Priority 4: If no config sources found, get all available secrets
    logger.debug('No secret keys specified. Getting a list of all available secrets')
    return this.listAllSecrets(projectId)
  }

  /**
   * Lists all available secrets in the project
   */
  private async listAllSecrets (projectId: string): Promise<string[]> {
    try {
      logger.debug(`Listing all secrets from project: ${projectId}`)
      const parent = `projects/${projectId}`

      const [secrets] = await this.client.listSecrets({ parent })

      const secretNames: string[] = []

      for (const secret of secrets) {
        // Check if the secret.name property exists
        if (secret.name) {
          // Extract the secret name from the full path (e.g., "projects/my-project/secrets/my-secret")
          const nameParts = secret.name.split('/')
          const secretName = nameParts[nameParts.length - 1]
          secretNames.push(secretName)
        }
      }

      logger.debug(`Found ${secretNames.length} secrets in project ${projectId}`)
      return secretNames
    } catch (error) {
      logger.error(`Error listing secrets: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }
}
