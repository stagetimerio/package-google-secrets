import { GoogleSecretsConfig } from './config.js'

let start: DOMHighResTimeStamp = performance.now()
let isDebug: boolean = false

export function init (config: GoogleSecretsConfig) {
  start = performance.now()
  isDebug = config.debug
}

export function debug (...args: any[]) {
  if (isDebug) console.debug(`[google-secrets]`, ...args, `(${ftime()})`)
}

export function info (...args: any[]) {
  console.info(`[google-secrets]`, ...args, `(${ftime()})`)
}

export function error (...args: any[]) {
  console.error(`[google-secrets]`, ...args)
}

function ftime () {
  return (performance.now() - start).toFixed(1) + 'ms'
}
