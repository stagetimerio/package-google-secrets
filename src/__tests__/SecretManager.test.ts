import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import { SecretManager } from '../SecretManager.js'
import type { GoogleSecretsConfig } from '../config.js'

// Mock the Google Cloud Secret Manager
vi.mock('@google-cloud/secret-manager', () => ({
  SecretManagerServiceClient: vi.fn()
}))

// Mock the utils module
vi.mock('../utils.js', () => ({
  readSecretKeysFromFile: vi.fn(),
  findConfigFile: vi.fn(),
  parseConfigFile: vi.fn()
}))

// Mock the logger module
vi.mock('../logger.js', () => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn()
}))

describe('SecretManager', () => {
  const mockClient = {
    auth: {
      getProjectId: vi.fn()
    },
    accessSecretVersion: vi.fn(),
    listSecrets: vi.fn()
  }

  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
    
    // Mock the SecretManagerServiceClient constructor
    ;(SecretManagerServiceClient as any).mockImplementation(function () { return mockClient })
    
    // Mock default project ID
    mockClient.auth.getProjectId.mockResolvedValue('test-project')
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('loadSecrets with prefix', () => {
    it('should apply prefix to environment variables', async () => {
      const config: GoogleSecretsConfig = {
        secretKeys: ['GITHUB_TOKEN'],
        secretKeysFile: undefined,
        preserveExisting: false,
        debug: false,
        timeout: 5000,
        autoDiscoverConfig: false,
        prefix: 'VITE_'
      }

      // Mock the secret retrieval
      mockClient.accessSecretVersion.mockResolvedValue([
        {
          payload: {
            data: Buffer.from('secret-value')
          }
        }
      ])

      const secretManager = new SecretManager(config)
      const result = await secretManager.loadSecrets()

      // Check that the secret was loaded with the prefix
      expect(result).toHaveProperty('VITE_GITHUB_TOKEN', 'secret-value')
      expect(result).toHaveProperty('GOOGLE_PROJECT_ID', 'test-project')
      
      // Check that environment variable was set with prefix
      expect(process.env.VITE_GITHUB_TOKEN).toBe('secret-value')
      expect(process.env.GOOGLE_PROJECT_ID).toBe('test-project')
      
      // Ensure original secret name was used for Google Cloud API call
      expect(mockClient.accessSecretVersion).toHaveBeenCalledWith({
        name: 'projects/test-project/secrets/GITHUB_TOKEN/versions/latest'
      })
    })

    it('should not apply prefix when prefix is undefined', async () => {
      const config: GoogleSecretsConfig = {
        secretKeys: ['API_KEY'],
        secretKeysFile: undefined,
        preserveExisting: false,
        debug: false,
        timeout: 5000,
        autoDiscoverConfig: false,
        prefix: undefined
      }

      mockClient.accessSecretVersion.mockResolvedValue([
        {
          payload: {
            data: Buffer.from('api-value')
          }
        }
      ])

      const secretManager = new SecretManager(config)
      const result = await secretManager.loadSecrets()

      expect(result).toHaveProperty('API_KEY', 'api-value')
      expect(process.env.API_KEY).toBe('api-value')
    })

    it('should respect preserveExisting with prefixed variables', async () => {
      // Set existing environment variable with prefix
      process.env.TEST_EXISTING_SECRET = 'existing-value'

      const config: GoogleSecretsConfig = {
        secretKeys: ['EXISTING_SECRET'],
        secretKeysFile: undefined,
        preserveExisting: true,
        debug: false,
        timeout: 5000,
        autoDiscoverConfig: false,
        prefix: 'TEST_'
      }

      mockClient.accessSecretVersion.mockResolvedValue([
        {
          payload: {
            data: Buffer.from('new-value')
          }
        }
      ])

      const secretManager = new SecretManager(config)
      const result = await secretManager.loadSecrets()

      // Should not override existing env var
      expect(process.env.TEST_EXISTING_SECRET).toBe('existing-value')
      // But should still return the loaded value
      expect(result).toHaveProperty('TEST_EXISTING_SECRET', 'new-value')
    })

    it('should handle empty prefix gracefully', async () => {
      const config: GoogleSecretsConfig = {
        secretKeys: ['TEST_SECRET'],
        secretKeysFile: undefined,
        preserveExisting: false,
        debug: false,
        timeout: 5000,
        autoDiscoverConfig: false,
        prefix: ''
      }

      mockClient.accessSecretVersion.mockResolvedValue([
        {
          payload: {
            data: Buffer.from('test-value')
          }
        }
      ])

      const secretManager = new SecretManager(config)
      const result = await secretManager.loadSecrets()

      expect(result).toHaveProperty('TEST_SECRET', 'test-value')
      expect(process.env.TEST_SECRET).toBe('test-value')
    })
  })
})