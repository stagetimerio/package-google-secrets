/**
 * Utility functions for Google Secrets
 */
import { readFile, stat } from 'fs/promises'
import { join, dirname } from 'path'
import * as logger from './logger.js'

const CONFIG_FILENAME = 'google-secrets.config.json'

/**
 * Parses JSON content that can be either an array or an object with secrets/prefix/overrideExisting
 */
function parseSecretsJson (content: any): ConfigFileData {
  // Handle both formats: simple array or {secrets: [...], prefix?: string, overrideExisting?: boolean}
  if (Array.isArray(content)) {
    return { secrets: content, prefix: undefined, overrideExisting: undefined }
  } else if (content && typeof content === 'object') {
    const secrets = Array.isArray(content.secrets) ? content.secrets : undefined
    const prefix = typeof content.prefix === 'string' ? content.prefix : undefined
    const overrideExisting = typeof content.overrideExisting === 'boolean' ? content.overrideExisting : undefined
    return { secrets, prefix, overrideExisting }
  }
  
  return { secrets: undefined, prefix: undefined, overrideExisting: undefined }
}

/**
 * Reads secret keys from a JSON file
 * Supports both simple array format and {secrets: [...], prefix?: string, overrideExisting?: boolean} format
 * Returns secrets, prefix, and overrideExisting if available
 */
export async function readSecretKeysFromFile (filePath: string): Promise<ConfigFileData & { secrets: string[] }> {
  try {
    logger.debug(`Reading secret keys from file: ${filePath}`)
    const fileContent = await readFile(filePath, { encoding: 'utf8' })
    const parsed = JSON.parse(fileContent)
    const result = parseSecretsJson(parsed)

    if (!result.secrets) {
      throw new Error('Invalid secrets file format. Expected an array or an object with a "secrets" array.')
    }

    return { secrets: result.secrets, prefix: result.prefix, overrideExisting: result.overrideExisting }
  } catch (error) {
    logger.error(`Error reading secret keys file: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

/**
 * Finds google-secrets.config.json by looking in the current directory
 * and walking up the directory tree
 */
export async function findConfigFile (startDir: string = process.cwd()): Promise<string | undefined> {
  let currentDir = startDir
  const maxLevels = 10 // Avoid infinite loops in case of filesystem issues
  let levels = 0

  logger.debug(`Looking for ${CONFIG_FILENAME} in directory tree, starting from: ${currentDir}`)

  try {
    while (currentDir && levels < maxLevels) {
      const filePath = join(currentDir, CONFIG_FILENAME)

      try {
        const stats = await stat(filePath)
        if (stats.isFile()) {
          logger.debug(`Found config file at: ${filePath}`)
          return filePath
        }
      } catch (error) {
        // File doesn't exist, continue
      }

      // Move up one directory
      const parentDir = dirname(currentDir)
      if (parentDir === currentDir) {
        // We've reached the root
        break
      }
      currentDir = parentDir
      levels++
    }

    logger.debug(`No ${CONFIG_FILENAME} found after checking ${levels} directories`)
    return undefined
  } catch (error) {
    logger.error(`Error searching for config file: ${error instanceof Error ? error.message : String(error)}`)
    return undefined
  }
}

/**
 * Configuration file structure
 */
export interface ConfigFileData {
  secrets?: string[]
  prefix?: string
  overrideExisting?: boolean
}

/**
 * Parse secret keys from a discovered config file
 * Returns both secrets and prefix if available
 */
export async function parseConfigFile (filePath: string): Promise<ConfigFileData> {
  try {
    logger.debug(`Parsing config file: ${filePath}`)
    const fileContent = await readFile(filePath, { encoding: 'utf8' })
    const parsed = JSON.parse(fileContent)
    const result = parseSecretsJson(parsed)

    if (!result.secrets && !result.prefix) {
      logger.error('Invalid config file format. Expected an array or an object with a "secrets" array and optional "prefix" string.')
    }

    return result
  } catch (error) {
    logger.error(`Error parsing config file: ${error instanceof Error ? error.message : String(error)}`)
    return { secrets: undefined, prefix: undefined }
  }
}

/**
 * Executes a promise with a timeout
 */
export function withTimeout<T> (promise: Promise<T>, ms: number, errorMessage = 'Operation timed out'): Promise<T> {
  if (!ms) {
    return promise
  }

  let timeoutId: NodeJS.Timeout

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage))
    }, ms)
  })

  return Promise.race([
    promise.then(result => {
      clearTimeout(timeoutId)
      return result
    }),
    timeoutPromise
  ])
}
