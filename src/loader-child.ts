/**
 * Stand-alone script that loads secrets and outputs them as JSON
 * This is designed to be run by the preloader using spawnSync
 */
import { getConfigFromEnv } from './config.js'
import { JSON_OUTPUT_MARKER } from './consts.js'
import { SecretManager } from './SecretManager.js'

async function loadAndOutput() {
  const config = getConfigFromEnv()
  const secretManager = new SecretManager(config)

  try {
    const secrets = await secretManager.loadSecrets()
    // Output the secrets as JSON to stdout
    console.log(JSON_OUTPUT_MARKER)
    console.log(JSON.stringify(secrets))
    process.exit(0)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Run the main function
loadAndOutput().catch(error => {
  console.error(error)
  process.exit(1)
})
