import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getConfigFromEnv, mergeConfig, type GoogleSecretsConfig } from '../config.js'

describe('config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getConfigFromEnv', () => {
    it('should return default config when no environment variables are set', () => {
      const config = getConfigFromEnv()
      
      expect(config).toEqual({
        secretKeys: undefined,
        secretKeysFile: undefined,
        overrideExisting: false,
        debug: false,
        timeout: 5000,
        autoDiscoverConfig: true,
        prefix: undefined
      })
    })

    it('should parse GOOGLE_SECRETS_PREFIX from environment', () => {
      process.env.GOOGLE_SECRETS_PREFIX = 'VITE_'
      
      const config = getConfigFromEnv()
      
      expect(config.prefix).toBe('VITE_')
    })

    it('should handle empty GOOGLE_SECRETS_PREFIX', () => {
      process.env.GOOGLE_SECRETS_PREFIX = ''
      
      const config = getConfigFromEnv()
      
      expect(config.prefix).toBe('')
    })

    it('should parse all environment variables correctly', () => {
      process.env.GOOGLE_SECRETS_KEYS = 'KEY1,KEY2,KEY3'
      process.env.GOOGLE_SECRETS_KEYS_FILE = '/path/to/file.json'
      process.env.GOOGLE_SECRETS_PREFIX = 'TEST_'
      process.env.GOOGLE_SECRETS_OVERRIDE_EXISTING = 'true'
      process.env.GOOGLE_SECRETS_DEBUG = 'true'
      process.env.GOOGLE_SECRETS_TIMEOUT = '10000'
      process.env.GOOGLE_SECRETS_AUTO_DISCOVER = 'false'
      
      const config = getConfigFromEnv()
      
      expect(config).toEqual({
        secretKeys: ['KEY1', 'KEY2', 'KEY3'],
        secretKeysFile: '/path/to/file.json',
        overrideExisting: true,
        debug: true,
        timeout: 10000,
        autoDiscoverConfig: false,
        prefix: 'TEST_'
      })
    })
  })

  describe('mergeConfig', () => {
    it('should merge options with environment config', () => {
      process.env.GOOGLE_SECRETS_PREFIX = 'ENV_'
      process.env.GOOGLE_SECRETS_DEBUG = 'true'
      
      const config = mergeConfig({
        prefix: 'OVERRIDE_',
        secretKeys: ['CUSTOM_KEY']
      })
      
      expect(config.prefix).toBe('OVERRIDE_') // Options should override env
      expect(config.debug).toBe(true) // Env values should be preserved
      expect(config.secretKeys).toEqual(['CUSTOM_KEY'])
    })

    it('should use environment values when options are not provided', () => {
      process.env.GOOGLE_SECRETS_PREFIX = 'FROM_ENV_'
      
      const config = mergeConfig({})
      
      expect(config.prefix).toBe('FROM_ENV_')
    })
  })
})