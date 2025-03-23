/**
 * Secret Manager module for Google Secrets
 * Interfaces with Google Cloud Secret Manager API
 */
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import type { GoogleSecretsConfig } from './config.js'
import { readSecretKeysFromFile } from './utils.js'
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

    // Add the project ID  as an environment variable and to the returned secrets object
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

        // Only set environment variable if it doesn't exist or preserveExisting is false
        if (!this.config.preserveExisting || process.env[secretKey] === undefined) {
          process.env[secretKey] = secretValue
          logger.debug(`Loaded secret: ${secretKey}`)
        } else {
          logger.debug(`Skipped existing environment variable: ${secretKey}`)
        }

        loadedSecrets[secretKey] = secretValue
      } catch (error) {
        logger.error(`Error loading secret ${secretKey}: ${error instanceof Error ? error.message : String(error)}`)
      }
    })

    await Promise.all(loadPromises)

    logger.info(`Successfully loaded ${Object.keys(loadedSecrets).length} secrets`)
    return loadedSecrets
  }

  /**
   * Gets a specific secret value from Secret Manager
   */
  private async getSecret(projectId: string, secretName: string): Promise<string> {
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
   * Gets the list of secret keys to load
   */
  private async getSecretKeys (projectId: string): Promise<string[]> {
    // Use keys from config if provided
    if (this.config.secretKeys && this.config.secretKeys.length > 0) {
      logger.debug('Using provided secretKeys')
      return this.config.secretKeys
    }

    // Read keys from file if specified
    if (this.config.secretKeysFile) {
      logger.debug('Using provided secretKeysFile')
      return readSecretKeysFromFile(this.config.secretKeysFile)
    }

    // If neither secretKeys nor secretKeysFile is provided, get all available secrets
    logger.debug('Getting a list of all available secrets')
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
