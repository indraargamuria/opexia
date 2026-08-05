import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runGates, parseArgs, deliver } from './deliver.mjs'

test('runGates aborts on a failing gate without running later gates', () => {
  const calls = []
  const exec = (cmd, args) => {
    calls.push(`${cmd} ${args.join(' ')}`)
    if (args.includes('typecheck')) throw new Error('boom')
  }
  const gates = [
    { dir: 'frontend', cmd: 'npm', args: ['run', 'test'] },
    { dir: 'frontend', cmd: 'npm', args: ['run', 'typecheck'] },
    { dir: 'backend', cmd: 'npm', args: ['run', 'test'] },
  ]
  assert.throws(() => runGates(exec, gates, 'root'), /Gate failed: frontend npm run typecheck/)
  assert.deepEqual(calls, ['npm run test', 'npm run typecheck'])
})

test('runGates runs every gate when all succeed', () => {
  const calls = []
  const exec = (cmd, args) => calls.push(`${cmd} ${args.join(' ')}`)
  const gates = [
    { dir: 'frontend', cmd: 'npm', args: ['run', 'test'] },
    { dir: 'frontend', cmd: 'npm', args: ['run', 'typecheck'] },
    { dir: 'backend', cmd: 'npm', args: ['run', 'test'] },
    { dir: 'backend', cmd: 'npm', args: ['run', 'typecheck'] },
  ]
  runGates(exec, gates, 'root')
  assert.equal(calls.length, 4)
})

test('parseArgs reads --message flag', () => {
  assert.deepEqual(parseArgs(['--message', 'feat(x): y']), { message: 'feat(x): y' })
})

test('parseArgs falls back to COMMIT_MSG env', () => {
  assert.deepEqual(parseArgs([], { COMMIT_MSG: 'chore: z' }), { message: 'chore: z' })
})

test('parseArgs returns null message when absent', () => {
  assert.deepEqual(parseArgs([], {}), { message: null })
})

test('deliver commits and pushes when gates are green', () => {
  const calls = []
  const exec = (cmd, args) => calls.push(`${cmd} ${args.join(' ')}`)
  const gates = [
    { dir: 'frontend', cmd: 'npm', args: ['run', 'test'] },
    { dir: 'frontend', cmd: 'npm', args: ['run', 'typecheck'] },
    { dir: 'backend', cmd: 'npm', args: ['run', 'test'] },
    { dir: 'backend', cmd: 'npm', args: ['run', 'typecheck'] },
  ]
  deliver(exec, { message: 'feat(x): y' }, 'root', gates)
  assert.deepEqual(calls, [
    'npm run test',
    'npm run typecheck',
    'npm run test',
    'npm run typecheck',
    'git add -A',
    'git commit -m feat(x): y',
    'git push',
  ])
})

test('deliver refuses to commit without a message', () => {
  const exec = () => {}
  assert.throws(() => deliver(exec, { message: null }, 'root'), /No commit message/)
})
