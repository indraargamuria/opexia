import { execSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm'

export const GATES = [
  { dir: 'frontend', cmd: NPM, args: ['run', 'test'] },
  { dir: 'frontend', cmd: NPM, args: ['run', 'typecheck'] },
  { dir: 'backend', cmd: NPM, args: ['run', 'test'] },
  { dir: 'backend', cmd: NPM, args: ['run', 'typecheck'] },
]

export function commandString(gate) {
  return `${gate.cmd} ${gate.args.join(' ')}`
}

export function runGates(exec = execSync, gates = GATES, rootDir = ROOT) {
  for (const gate of gates) {
    try {
      exec(commandString(gate), { cwd: join(rootDir, gate.dir), stdio: 'inherit' })
    } catch {
      throw new Error(`Gate failed: ${commandString(gate)}`)
    }
  }
}

export function parseArgs(argv = process.argv.slice(2), env = process.env) {
  const flagIndex = argv.indexOf('--msg') !== -1 ? argv.indexOf('--msg') : argv.indexOf('--message')
  if (flagIndex !== -1 && argv[flagIndex + 1]) return { message: argv[flagIndex + 1] }
  if (argv.length > 0 && !argv[0].startsWith('-')) return { message: argv[0] }
  if (env.COMMIT_MSG) return { message: env.COMMIT_MSG }
  return { message: null }
}

export function deliver(exec = execSync, { message } = {}, rootDir = ROOT, gates = GATES) {
  runGates(exec, gates, rootDir)
  if (!message) {
    throw new Error('No commit message provided. Use --message or COMMIT_MSG env.')
  }
  exec('git add -A', { cwd: rootDir, stdio: 'inherit' })
  exec('git commit -m ' + JSON.stringify(message), { cwd: rootDir, stdio: 'inherit' })
  exec('git push', { cwd: rootDir, stdio: 'inherit' })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  deliver(execSync, parseArgs())
}
