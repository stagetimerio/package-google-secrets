import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFile, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { parseConfigFile, readSecretKeysFromFile } from '../utils.js'

describe('utils', () => {
  const tempDir = '/tmp'
  const testFiles: string[] = []

  const createTempFile = async (content: any, suffix = 'test-config.json') => {
    const filePath = join(tempDir, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${suffix}`)
    await writeFile(filePath, JSON.stringify(content))
    testFiles.push(filePath)
    return filePath
  }

  afterEach(async () => {
    // Clean up temp files
    for (const file of testFiles) {
      try {
        await unlink(file)
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    testFiles.length = 0
  })

  describe('parseConfigFile', () => {
    it('should parse simple array format', async () => {
      const config = ['SECRET1', 'SECRET2', 'SECRET3']
      const filePath = await createTempFile(config)
      
      const result = await parseConfigFile(filePath)
      
      expect(result).toEqual({
        secrets: ['SECRET1', 'SECRET2', 'SECRET3'],
        prefix: undefined
      })
    })

    it('should parse object format with secrets and prefix', async () => {
      const config = {
        secrets: ['GITHUB_TOKEN', 'DATABASE_URL'],
        prefix: 'VITE_'
      }
      const filePath = await createTempFile(config)
      
      const result = await parseConfigFile(filePath)
      
      expect(result).toEqual({
        secrets: ['GITHUB_TOKEN', 'DATABASE_URL'],
        prefix: 'VITE_'
      })
    })

    it('should parse object format with only secrets', async () => {
      const config = {
        secrets: ['API_KEY']
      }
      const filePath = await createTempFile(config)
      
      const result = await parseConfigFile(filePath)
      
      expect(result).toEqual({
        secrets: ['API_KEY'],
        prefix: undefined
      })
    })

    it('should parse object format with only prefix', async () => {
      const config = {
        prefix: 'MY_APP_'
      }
      const filePath = await createTempFile(config)
      
      const result = await parseConfigFile(filePath)
      
      expect(result).toEqual({
        secrets: undefined,
        prefix: 'MY_APP_'
      })
    })

    it('should handle invalid config format gracefully', async () => {
      const config = {
        invalid: 'format'
      }
      const filePath = await createTempFile(config)
      
      const result = await parseConfigFile(filePath)
      
      expect(result).toEqual({
        secrets: undefined,
        prefix: undefined
      })
    })

    it('should handle file read errors gracefully', async () => {
      const result = await parseConfigFile('/non/existent/file.json')
      
      expect(result).toEqual({
        secrets: undefined,
        prefix: undefined
      })
    })
  })

  describe('readSecretKeysFromFile', () => {
    it('should read simple array format', async () => {
      const config = ['SECRET1', 'SECRET2']
      const filePath = await createTempFile(config, 'secrets.json')
      
      const result = await readSecretKeysFromFile(filePath)
      
      expect(result).toEqual({
        secrets: ['SECRET1', 'SECRET2'],
        prefix: undefined
      })
    })

    it('should read object format with secrets and prefix', async () => {
      const config = {
        secrets: ['TOKEN1', 'TOKEN2'],
        prefix: 'TEST_'
      }
      const filePath = await createTempFile(config, 'secrets.json')
      
      const result = await readSecretKeysFromFile(filePath)
      
      expect(result).toEqual({
        secrets: ['TOKEN1', 'TOKEN2'],
        prefix: 'TEST_'
      })
    })

    it('should read object format with only secrets', async () => {
      const config = {
        secrets: ['ONLY_SECRETS']
      }
      const filePath = await createTempFile(config, 'secrets.json')
      
      const result = await readSecretKeysFromFile(filePath)
      
      expect(result).toEqual({
        secrets: ['ONLY_SECRETS'],
        prefix: undefined
      })
    })

    it('should throw error for invalid format', async () => {
      const config = {
        invalid: 'format'
      }
      const filePath = await createTempFile(config, 'secrets.json')
      
      await expect(readSecretKeysFromFile(filePath)).rejects.toThrow(
        'Invalid secrets file format. Expected an array or an object with a "secrets" array.'
      )
    })

    it('should throw error for non-existent file', async () => {
      await expect(readSecretKeysFromFile('/non/existent/file.json')).rejects.toThrow()
    })
  })
})