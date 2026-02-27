/**
 * Entry point for `-r` / `--import` flag usage that loads secrets in a child process
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

function loadSecretsSync () {
  // Guard against double-loading (e.g. CJS/ESM dual-package hazard when mixing --require and --import)
  if (process.env._GOOGLE_SECRETS_LOADED) {
    logger.debug('Secrets already loaded, skipping')
    return
  }

  logger.debug('Initializing Google Secrets')

  // Determine paths
  // Determine the correct extension based on whether we're running as CJS or ESM
  const ext = typeof __filename !== 'undefined' ? '.cjs' : '.mjs'
  const loaderPath = join(getDirname(), `loader-child${ext}`)

  // Use spawnSync to run the loader script and wait for completion
  logger.debug('Spawning secret loader process')
  const result = spawnSync(process.execPath, [loaderPath], {
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'inherit'],
    encoding: 'utf8',
    timeout: config.timeout || 30000
  })

  if (result.error) {
    logger.error(`Error loading secrets: ${result.error.message}`)
    return
  }
  if (result.status !== 0) {
    logger.error(`Secret loading failed with code ${result.status}: ${result.stderr}`)
    return
  }

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

    process.env._GOOGLE_SECRETS_LOADED = '1'
    logger.info(`Loaded ${Object.keys(secrets).length} secrets: ${Object.keys(secrets).join(', ')}`)
  } catch (error) {
    logger.error(`Error parsing secrets: ${error instanceof Error ? error.message : String(error)}`)
  }
}

loadSecretsSync()
