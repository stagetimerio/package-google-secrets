/**
 * Utility functions for Google Secrets
 */
import { readFile, stat } from 'fs/promises'
import { join, dirname } from 'path'
import * as logger from './logger.js'

const CONFIG_FILENAME = 'google-secrets.config.json'

/**
 * Reads secret keys from a JSON file
 * Supports both simple array format and {secrets: [...]} format
 */
export async function readSecretKeysFromFile (filePath: string): Promise<string[]> {
  try {
    logger.debug(`Reading secret keys from file: ${filePath}`)
    const fileContent = await readFile(filePath, { encoding: 'utf8' })
    const parsed = JSON.parse(fileContent)

    // Handle both formats: simple array or {secrets: [...]}
    if (Array.isArray(parsed)) {
      return parsed
    } else if (parsed && Array.isArray(parsed.secrets)) {
      return parsed.secrets
    }

    throw new Error('Invalid secrets file format. Expected an array or an object with a "secrets" array.')
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
 * Parse secret keys from a discovered config file
 */
export async function parseConfigFile (filePath: string): Promise<string[] | undefined> {
  try {
    logger.debug(`Parsing config file: ${filePath}`)
    const fileContent = await readFile(filePath, { encoding: 'utf8' })
    const parsed = JSON.parse(fileContent)

    // Handle both formats: simple array or {secrets: [...]}
    if (Array.isArray(parsed)) {
      return parsed
    } else if (parsed && Array.isArray(parsed.secrets)) {
      return parsed.secrets
    }

    logger.error('Invalid config file format. Expected an array or an object with a "secrets" array.')
    return undefined
  } catch (error) {
    logger.error(`Error parsing config file: ${error instanceof Error ? error.message : String(error)}`)
    return undefined
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
