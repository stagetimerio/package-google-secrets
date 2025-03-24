# @stagetimerio/google-secrets

Load secrets from Google Cloud Secret Manager into environment variables, similar to how `dotenv` works. 

This package also automatically sets the Google Cloud project ID as `GOOGLE_PROJECT_ID` in your environment variables.

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
  
  // You can also access the Google project ID
  console.log(process.env.GOOGLE_PROJECT_ID);
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

## Configuration File

By default, the package will look for a `google-secrets.config.json` file in the current directory and parent directories (similar to how ESLint finds `.eslintrc`). This allows you to specify which secrets to load without setting environment variables.

Example `google-secrets.config.json`:

```json
[
  "API_KEY",
  "DATABASE_PASSWORD",
  "JWT_SECRET"
]
```

Or with a `secrets` property:

```json
{
  "secrets": [
    "API_KEY",
    "DATABASE_PASSWORD",
    "JWT_SECRET"
  ]
}
```

## Configuration Priority

The package uses the following priority when determining which secrets to load:

1. `GOOGLE_SECRETS_KEYS` environment variable (comma-separated list)
2. `GOOGLE_SECRETS_KEYS_FILE` environment variable (path to a JSON file)
3. Auto-discovered `google-secrets.config.json` file
4. If none of the above are found, all available secrets from the project are loaded

## Technical Details

### Child Process Architecture

The package uses a child process to load secrets when used with the `-r` flag. This approach is necessary because Node.js's `-r` flag mechanism expects synchronous module loading, but accessing the Secret Manager API requires asynchronous operations.

By spawning a separate child process, we can perform asynchronous API calls and then wait for them to complete before continuing with the main application execution.

### Google Project ID

The package automatically sets the Google Cloud project ID as an environment variable `GOOGLE_PROJECT_ID`. This is determined from the authentication client and is always set, regardless of whether any secrets are loaded.

## Environment Variable Configuration

The package can be configured using environment variables:

| Environment Variable | Description | Default |
|---|---|---|
| `GOOGLE_SECRETS_KEYS` | Comma-separated list of secret names to load | None |
| `GOOGLE_SECRETS_KEYS_FILE` | Path to JSON file with secret names | None |
| `GOOGLE_SECRETS_DEBUG` | Enable debug logging | `false` |
| `GOOGLE_SECRETS_TIMEOUT` | Timeout for loading secrets in milliseconds | `5000` (5 seconds) |
| `GOOGLE_SECRETS_PRESERVE_EXISTING` | Don't override existing env variables | `true` |
| `GOOGLE_SECRETS_AUTO_DISCOVER` | Enable auto-discovery of config file | `true` |

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
