/**
 * Entry point for `-r` flag usage that loads secrets in a child process
 */
import { getConfigFromEnv } from './config.js'
import { spawnSync } from 'child_process'
import { getDirname } from 'cross-dirname'
import { join } from 'path'
import * as logger from './logger.js'
import { JSON_OUTPUT_MARKER } from './consts.js'

// Get configuration from environment
const config = getConfigFromEnv()
logger.init(config)

logger.debug('Initializing Google Secrets with -r flag')

// Determine paths
const loaderPath = join(getDirname(), 'loader-child.js')

// Create and pass all current environment variables to the child process
const env = { ...process.env }

// Use spawnSync to run the loader script and wait for completion
logger.debug('Spawning secret loader process')
const result = spawnSync(process.execPath, [loaderPath], {
  env: env,
  stdio: ['ignore', 'pipe', 'inherit'],
  encoding: 'utf8',
  timeout: config.timeout || 30000
})

if (result.error) {
  logger.error(`Error loading secrets: ${result.error.message}`)
} else if (result.status !== 0) {
  logger.error(`Secret loading failed with code ${result.status}: ${result.stderr}`)
} else {
  // Success - parse the secrets from stdout and set them in the environment
  try {
    let secrets = {}

    // Split the output by the marker
    const stdoutParts = result.stdout.split(JSON_OUTPUT_MARKER)
    if (stdoutParts.length < 2) throw new Error('Output marker not found in loader script output')

    // Handle logs
    const logs = stdoutParts.shift()
    if (logs) logs.split('\n').map((str) => str.trim()).filter(Boolean).forEach((log) => console.info(log))

    // Handle output
    const output = stdoutParts.shift()
    if (output) secrets = JSON.parse(output.trim())
    for (const [key, value] of Object.entries(secrets)) {
      if (typeof value === 'string' && (config.overrideExisting || process.env[key] === undefined)) {
        process.env[key] = value
      }
    }

    logger.info(`Loaded ${Object.keys(secrets).length} secrets: ${Object.keys(secrets).join(', ')}`)
  } catch (error) {
    logger.error(`Error parsing secrets: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Export the loadSecrets function for programmatic usage
export { loadSecrets } from './index.js'
