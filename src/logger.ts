import { GoogleSecretsConfig } from './config.js'

let start: DOMHighResTimeStamp = performance.now()
let isDebug: boolean = false

const red = '\x1B[31m'
const yellow = '\x1B[33m'
const green = '\x1B[32m'
const black = '\x1B[39m'

export function init (config: GoogleSecretsConfig) {
  start = performance.now()
  isDebug = config.debug
}

export function debug (...args: any[]) {
  if (isDebug) console.debug(`[google-secrets]`, ...args, `(${ftime()})`)
}

export function info (...args: any[]) {
  console.info(`${green}[google-secrets]`, ...args, `(${ftime()})${black}`)
}

export function error (...args: any[]) {
  console.error(`[google-secrets]`, ...args)
}

function ftime () {
  return (performance.now() - start).toFixed(1) + ' ms'
}
