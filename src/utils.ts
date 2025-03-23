/**
 * Utility functions for Google Secrets
 */
import { readFile } from 'fs/promises'
import * as logger from './logger.js'

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
