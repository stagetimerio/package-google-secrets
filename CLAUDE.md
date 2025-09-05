# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**@stagetimerio/google-secrets** is a Node.js package that loads secrets from Google Cloud Secret Manager into environment variables, similar to how `dotenv` works. It's designed as a drop-in replacement for dotenv but using Google Cloud Secret Manager as the source.

The package supports both programmatic usage and command-line preloading via Node's `-r` flag, making it suitable for various deployment scenarios including cloud environments and local development.

## Architecture

### Dual Build System
- **TypeScript source** in `src/` compiled to dual output formats
- **CommonJS** build in `dist/cjs/` for Node.js compatibility
- **ESM** build in `dist/esm/` for modern module systems
- **Type definitions** in `dist/types/` for TypeScript consumers

### Core Components

#### Entry Points
- `src/index.ts` - Main programmatic API (`loadSecrets()` function)
- `src/load.ts` - Command-line loader using `-r` flag (spawns child process)
- `src/loader-child.ts` - Child process script that actually loads secrets

#### Key Classes/Modules
- `SecretManager` (`src/SecretManager.ts`) - Main class interfacing with Google Cloud Secret Manager API
- `config.ts` - Configuration management from environment variables and options
- `utils.ts` - File parsing, config discovery, and timeout utilities

### Child Process Architecture
The package uses a unique child process architecture for the `-r` flag usage:
1. `load.ts` spawns `loader-child.ts` using `spawnSync`
2. Child process loads secrets asynchronously and outputs JSON to stdout
3. Parent process parses the JSON output and sets environment variables
4. This approach is necessary because Node's `-r` requires synchronous loading

### Configuration Priority System
1. `GOOGLE_SECRETS_KEYS` environment variable (comma-separated)
2. `GOOGLE_SECRETS_KEYS_FILE` environment variable (path to JSON file)
3. Auto-discovered `google-secrets.config.json` (walks directory tree upward)
4. If none found, loads all available secrets from the Google Cloud project

### Secret Loading Features
- **Parallel loading** - All secrets loaded concurrently for performance
- **Environment preservation** - Won't override existing env vars by default
- **Project ID injection** - Automatically sets `GOOGLE_PROJECT_ID`
- **Timeout support** - Configurable timeout to prevent hanging
- **Debug logging** - Comprehensive logging for troubleshooting

## Essential Commands

### Development
```bash
# Build both CommonJS and ESM distributions
npm run build

# Watch mode for development (rebuild on changes)
npm run watch

# Clean and rebuild everything
npm run build
```

### Build System Details
```bash
# Build ESM version only
npm run build:esm

# Build CommonJS version only  
npm run build:cjs
```

The build process:
1. Compiles TypeScript using separate tsconfig files for each target
2. Creates `package.json` files in each dist folder to define module type
3. Generates source maps and type definitions

### Testing & Quality
Currently no tests defined - would need to be added for robust development.

## Key Environment Variables

Configuration via environment variables (all optional):

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_SECRETS_KEYS` | Comma-separated secret names | None |
| `GOOGLE_SECRETS_KEYS_FILE` | Path to JSON file with secret names | None |
| `GOOGLE_SECRETS_DEBUG` | Enable debug logging | `false` |
| `GOOGLE_SECRETS_TIMEOUT` | Timeout in milliseconds | `5000` |
| `GOOGLE_SECRETS_PRESERVE_EXISTING` | Don't override existing env vars | `true` |
| `GOOGLE_SECRETS_AUTO_DISCOVER` | Search for config files | `true` |

## Usage Patterns

### Programmatic Usage
```javascript
import { loadSecrets } from '@stagetimerio/google-secrets'
await loadSecrets()
```

### Command-line Usage
```bash
# Auto-load all secrets
node -r @stagetimerio/google-secrets/load app.js

# With specific secrets
GOOGLE_SECRETS_KEYS=API_KEY,DB_PASSWORD node -r @stagetimerio/google-secrets/load app.js

# Combined with dotenv
node -r dotenv/config -r @stagetimerio/google-secrets/load app.js
```

### Configuration Files
```json
// google-secrets.config.json
["API_KEY", "DATABASE_PASSWORD"]

// Alternative format
{
  "secrets": ["API_KEY", "DATABASE_PASSWORD"] 
}
```

## Implementation Notes

### Google Cloud Integration
- Uses `@google-cloud/secret-manager` SDK
- Requires Google Cloud authentication (service account or default credentials)
- Automatically detects Google Cloud project ID
- Supports accessing latest version of secrets only

### Error Handling
- Graceful handling of missing secrets (logs error but continues)
- Timeout protection to prevent hanging in cloud environments
- Comprehensive error messages for troubleshooting

### Performance Considerations
- Parallel secret loading for better performance
- Child process isolation prevents blocking main application startup
- Configurable timeouts to handle slow network conditions

## Code Conventions

### TypeScript Style
- Strict TypeScript configuration with full type safety
- Interface-driven design with clear type definitions
- Async/await pattern throughout (no callbacks or promises chains)
- Comprehensive JSDoc comments on public APIs

### Module System
- ESM-first design with CommonJS compatibility
- Dual package.json approach for proper module resolution
- Explicit file extensions in imports (`.js` for compiled output)

### Error Handling Pattern
- Try/catch blocks with specific error messages
- Logging before re-throwing errors
- Type-safe error handling (`error instanceof Error`)

## Dependencies

### Production
- `@google-cloud/secret-manager` - Google Cloud SDK
- `cross-dirname` - Cross-platform `__dirname` equivalent for ESM

### Development
- `typescript` - TypeScript compiler
- `concurrently` - Run multiple build processes
- `rimraf` - Cross-platform file deletion

## Integration with Larger Stagetimer Project

This package is part of the Stagetimer monorepo and is used across multiple components:
- Server applications use it to load database credentials and API keys
- Cloud Functions use it for configuration management
- Provides consistent secret management across all environments