# Building `@stagetimerio/google-secrets` Package

This document provides instructions for implementing a Node.js package to load secrets from Google Cloud Secret Manager into environment variables, similar to how `dotenv` works.

## Overview

The `@stagetimerio/google-secrets` package will:

1. Load secrets from Google Cloud Secret Manager
2. Set them as environment variables
3. Support preloading via the `-r` flag in Node.js
4. Work seamlessly with existing tooling like `dotenv`

## Package Structure

```
@stagetimerio/google-secrets/
├── src/                         # TypeScript source files
│   ├── index.ts                 # Main package entry point
│   ├── load.ts                  # Entry point for -r preloading
│   ├── config.ts                # Configuration handling
│   ├── secretManager.ts         # Google Secret Manager wrapper
│   └── utils.ts                 # Utility functions
├── dist/                        # Compiled JavaScript files
├── package.json                 # Package metadata
├── tsconfig.json                # TypeScript configuration
└── README.md                    # Documentation
```

## Implementation Details

### Configuration Module (`config.ts`)

**Purpose**: Define configuration options and read them from environment variables.

**Configuration Options**:
- `projectId`: Google Cloud project ID (from `GOOGLE_SECRETS_PROJECT` or `GOOGLE_CLOUD_PROJECT`)
- `secretKeys`: List of secret names to load (from `GOOGLE_SECRETS_KEYS`)
- `secretKeysFile`: Path to JSON file with secret names (from `GOOGLE_SECRETS_KEYS_FILE`)
- `preserveExisting`: Don't override existing env variables (default: true)
- `debug`: Print debug information (from `GOOGLE_SECRETS_DEBUG`)
- `timeout`: Timeout for loading secrets in milliseconds (from `GOOGLE_SECRETS_TIMEOUT`)

**Pseudo-code**:
```
function getConfigFromEnv():
  Read and parse environment variables
  Return configuration object
```

### Secret Manager Module (`secretManager.ts`)

**Purpose**: Interface with Google Cloud Secret Manager API.

**Functionality**:
- Initialize connection to Secret Manager
- Load secrets and set as environment variables
- Cache secrets to avoid repeated API calls
- Handle errors gracefully

**Pseudo-code**:
```
class SecretManager:
  constructor(config):
    Initialize client and cache

  async loadSecrets():
    Get list of secret keys
    For each secret key:
      Get secret value
      If preserveExisting is false or env var doesn't exist:
        Set as environment variable
    Return loaded secrets

  private async getSecret(projectId, secretName):
    If in cache, return cached value
    Fetch from Secret Manager API
    Cache and return value

  private async getSecretKeys():
    If secretKeys provided in config, use them
    If secretKeysFile provided, read from file
    Return list of keys
```

### Utilities Module (`utils.ts`)

**Purpose**: Helper functions for the package.

**Functionality**:
- Read secret keys from JSON file
- Timeout handling functions

**Pseudo-code**:
```
async function readSecretKeysFromFile(filePath):
  Read and parse JSON file
  Extract array of secret names
  Return list of keys

function withTimeout(promise, ms):
  Race promise against timeout
  Return result or throw timeout error
```

### Main Module (`index.ts`)

**Purpose**: Main entry point for programmatic usage.

**Functionality**:
- Export functions for loading secrets
- Apply configuration

**Pseudo-code**:
```
async function loadSecrets(options = {}):
  Merge provided options with environment config
  Create SecretManager instance
  Apply timeout if specified
  Return loaded secrets
```

### Load Module (`load.ts`)

**Purpose**: Entry point for `-r` flag usage.

**Functionality**:
- Handle the async nature of secret loading with Node's require system
- Provide a way for applications to wait for secrets to be fully loaded

**Pseudo-code**:
```
// This runs when module is loaded with -r flag
Get configuration from environment
Start loading secrets asynchronously
Set flag when secrets are loaded

// Export function for applications to wait for loading
function waitForSecrets():
  If secrets already loaded, resolve immediately
  Otherwise, poll until loaded
```

## Usage Examples

### Basic Usage

```javascript
// Load secrets in your application
import { loadSecrets } from '@stagetimerio/google-secrets';

async function start() {
  // Load secrets into process.env
  await loadSecrets();
  
  // Now you can use process.env.SECRET_NAME
  console.log(process.env.MY_SECRET);
}
```

### Preloading with `-r` Flag

```bash
# Load all secrets from the default project
node -r @stagetimerio/google-secrets/load app.js

# Specify secrets to load via environment variable
GOOGLE_SECRETS_KEYS=API_KEY,DATABASE_PASSWORD node -r @stagetimerio/google-secrets/load app.js

# Use a JSON file to specify secrets
GOOGLE_SECRETS_KEYS_FILE=./secrets.json node -r @stagetimerio/google-secrets/load app.js

# Enable debug output
GOOGLE_SECRETS_DEBUG=true node -r @stagetimerio/google-secrets/load app.js
```

### With dotenv

```bash
# Load .env first, then Google secrets
node -r dotenv/config -r @stagetimerio/google-secrets/load app.js
```

### Waiting for Secrets to Load

```javascript
// In your application
import { waitForSecrets } from '@stagetimerio/google-secrets/load';

async function main() {
  // Wait for secrets to be fully loaded
  await waitForSecrets();
  
  // Now we can be sure all secrets are available
  console.log(process.env.MY_SECRET);
}
```

## Key Technical Challenges

### 1. Asynchronous Loading with `-r` Flag

Node's `-r` flag was designed for synchronous loading. To handle asynchronous API calls:

- Start loading secrets immediately but don't block application startup
- Provide a `waitForSecrets()` function for apps that need to ensure secrets are loaded
- Use a flag to track when loading completes

### 2. Authentication

The package relies on standard Google Cloud authentication:
- Use `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- No additional auth configuration needed

### 3. Error Handling

- Gracefully handle failed API calls
- Log errors but don't crash the application
- Skip unavailable secrets

### 4. Performance Optimization

- Cache secrets to minimize API calls 
- Load secrets in parallel
- Configurable timeouts

## Configuration File Format

Example `secrets.json`:

```json
{
  "secrets": [
    "API_KEY",
    "DATABASE_PASSWORD",
    "JWT_SECRET"
  ]
}
```

Or simpler format:

```json
[
  "API_KEY",
  "DATABASE_PASSWORD",
  "JWT_SECRET"
]
```

## Package Integration

Your scripts in `package.json` would look like:

```json
"scripts": {
  "dev": "cross-env TZ='UTC' PORT=3000 SERVER_ID=local-3000 nodemon -r dotenv/config -r @stagetimerio/google-secrets/load --ignore 'scripts/*' --stack-trace-limit=20 --experimental-specifier-resolution=node _server.web.js"
}
```

This allows you to:
1. Load `.env` variables with `dotenv/config`
2. Load Google Cloud secrets with `@stagetimerio/google-secrets/load`
3. Start your application with all environment variables set
