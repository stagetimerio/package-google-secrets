# @stagetimerio/google-secrets

Load secrets from Google Cloud Secret Manager into environment variables, similar to how `dotenv` works.

## Installation

```bash
npm install @stagetimerio/google-secrets
```

## Basic Usage

```javascript
// Programmatic usage
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
# This will automatically fetch all available secrets in the project
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

## Technical Details

### Child Process Architecture

The package uses a child process to load secrets when used with the `-r` flag. This approach is necessary because Node.js's `-r` flag mechanism expects synchronous module loading, but accessing the Secret Manager API requires asynchronous operations.

By spawning a separate child process, we can perform asynchronous API calls and then wait for them to complete before continuing with the main application execution.

## Configuration

The package can be configured using environment variables:

> **Note:** If neither `GOOGLE_SECRETS_KEYS` nor `GOOGLE_SECRETS_KEYS_FILE` is provided, the package will automatically fetch and load all available secrets from the specified project.

| Environment Variable | Description | Default |
|---|---|---|
| `GOOGLE_SECRETS_KEYS` | Comma-separated list of secret names to load | None (loads all secrets if not specified) |
| `GOOGLE_SECRETS_KEYS_FILE` | Path to JSON file with secret names | None |
| `GOOGLE_SECRETS_DEBUG` | Enable debug logging | `false` |
| `GOOGLE_SECRETS_TIMEOUT` | Timeout for loading secrets in milliseconds | `5000` (5 seconds) |
| `GOOGLE_SECRETS_PRESERVE_EXISTING` | Don't override existing env variables | `true` |

### Secrets File Format

You can specify secrets to load in a JSON file. The file can use either of these formats:

Simple array format:
```json
[
  "API_KEY",
  "DATABASE_PASSWORD",
  "JWT_SECRET"
]
```

Or with a `secrets` key:
```json
{
  "secrets": [
    "API_KEY",
    "DATABASE_PASSWORD",
    "JWT_SECRET"
  ]
}
```

## Authentication

This package uses Google Cloud authentication. The simplest way to authenticate is by setting the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to your service account key file.

In cloud environments (like Google Cloud Run or GCP Compute Engine), authentication typically happens automatically.

## Example: Package Integration

Your scripts in `package.json` might look like:

```json
"scripts": {
  "dev": "cross-env TZ='UTC' PORT=3000 SERVER_ID=local-3000 nodemon -r dotenv/config -r @stagetimerio/google-secrets/load --ignore 'scripts/*' --stack-trace-limit=20 --experimental-specifier-resolution=node _server.web.js"
}
```

## License

ISC
