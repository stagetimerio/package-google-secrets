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
  
  // Load specific secrets with a prefix
  await loadSecrets({
    secretKeys: ['GITHUB_TOKEN', 'DATABASE_URL'],
    prefix: 'VITE_'
  });
  
  // Now you can use process.env.SECRET_NAME
  console.log(process.env.MY_SECRET);
  console.log(process.env.VITE_GITHUB_TOKEN);
  
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

# Add a prefix to all loaded environment variables
GOOGLE_SECRETS_PREFIX=VITE_ GOOGLE_SECRETS_KEYS=GITHUB_TOKEN,API_KEY node -r @stagetimerio/google-secrets/load app.js
# Results in: VITE_GITHUB_TOKEN and VITE_API_KEY

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
  ],
  "prefix": "VITE_"
}
```

### Configuration Priority

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

## Configuration Options

### **Secret Keys**
Config file: `secrets`
Env Var: `GOOGLE_SECRETS_KEYS`
Possible values: Array of secret names or comma-separated string
Default: `undefined` (loads all secrets)

### **Secret Keys File**
Config file: N/A
Env Var: `GOOGLE_SECRETS_KEYS_FILE`
Possible values: Path to JSON file
Default: `undefined`

### **Prefix**
Config file: `prefix`
Env Var: `GOOGLE_SECRETS_PREFIX`
Possible values: Any string
Default: `undefined`

### **Debug Mode**
Config file: N/A
Env Var: `GOOGLE_SECRETS_DEBUG`
Possible values: `true`, `false`
Default: `false`

### **Timeout**
Config file: N/A
Env Var: `GOOGLE_SECRETS_TIMEOUT`
Possible values: Number (milliseconds)
Default: `5000`

### **Preserve Existing**
Config file: N/A
Env Var: `GOOGLE_SECRETS_PRESERVE_EXISTING`
Possible values: `true`, `false`
Default: `true`

### **Auto Discover Config**
Config file: N/A
Env Var: `GOOGLE_SECRETS_AUTO_DISCOVER`
Possible values: `true`, `false`
Default: `true`

### Configuration Priority

Programmatic options > Environment variables > Config file > Defaults

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

## Issues with Dependencies

- rimraf: v6 only supports Node 22
