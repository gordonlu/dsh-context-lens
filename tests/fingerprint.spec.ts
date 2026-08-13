import { describe, expect, it } from 'vitest'
import {
  canonicalJson,
  EMPTY_HEADER,
  estimateBlocksTokens,
  estimateBlockTokens,
  estimateSchemaTokens,
  estimateTextTokens,
  fingerprintHeader,
  hashText,
  hashValue,
} from '../src/fingerprint.ts'
import { epochHeader, textBlock, toolSchema } from './helpers.ts'

describe('canonicalJson', () => {
  it('is stable across key order', () => {
    const a = canonicalJson({ b: 1, a: { d: 2, c: 3 } })
    const b = canonicalJson({ a: { c: 3, d: 2 }, b: 1 })
    expect(a).toBe(b)
    expect(a).toBe('{"a":{"c":3,"d":2},"b":1}')
  })

  it('preserves array order', () => {
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]))
  })

  it('serializes primitives verbatim', () => {
    expect(canonicalJson(null)).toBe('null')
    expect(canonicalJson('x')).toBe('"x"')
    expect(canonicalJson(undefined)).toBe(undefined)
  })
})

describe('hashText / hashValue', () => {
  it('is deterministic and distinct per input', () => {
    expect(hashText('same')).toBe(hashText('same'))
    expect(hashText('same')).not.toBe(hashText('other'))
    expect(hashValue({ a: 1 })).toBe(hashValue({ a: 1 }))
  })

  it('produces 64-hex sha256 digests', () => {
    expect(hashText('x')).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('heuristic pricing', () => {
  it('prices text at 4 chars per token plus block overhead', () => {
    expect(estimateTextTokens('')).toBe(4)
    expect(estimateTextTokens('a'.repeat(400))).toBe(100 + 4)
  })

  it('prices tool schemas at 4 chars per token plus overhead', () => {
    const schema = toolSchema('greet')
    expect(estimateSchemaTokens(schema)).toBe(Math.ceil(JSON.stringify(schema).length / 4) + 4)
  })

  it('prices block lists by summing per-block prices', () => {
    const blocks = [textBlock('a'.repeat(8)), textBlock('b'.repeat(4))]
    expect(estimateBlocksTokens(blocks)).toBe(
      estimateBlockTokens(blocks[0]!) + estimateBlockTokens(blocks[1]!),
    )
  })
})

describe('fingerprintHeader', () => {
  it('maps an absent header to the empty fingerprint', () => {
    expect(fingerprintHeader(undefined)).toBe(EMPTY_HEADER)
  })

  it('hashes config and system but never retains their text', () => {
    const fingerprint = fingerprintHeader(epochHeader('you are helpful', []))
    expect(fingerprint.configHash).toMatch(/^[0-9a-f]{64}$/)
    expect(fingerprint.systemHash).toMatch(/^[0-9a-f]{64}$/)
    expect(fingerprint.systemBytes).toBe(Buffer.byteLength('you are helpful', 'utf8'))
    expect(fingerprint.toolsHash).toBeUndefined()
    expect(fingerprint.toolCount).toBeUndefined()
    expect(JSON.stringify(fingerprint)).not.toContain('helpful')
  })

  it('fingerprints each tool by name and canonical schema hash', () => {
    const fingerprint = fingerprintHeader(epochHeader(undefined, [toolSchema('greet')]))
    const tool = fingerprint.tools[0]!
    expect(tool.name).toBe('greet')
    expect(tool.schemaHash).toMatch(/^[0-9a-f]{64}$/)
    expect(fingerprint.toolsHash).toMatch(/^[0-9a-f]{64}$/)
    expect(fingerprint.toolCount).toBe(1)
    expect(JSON.stringify(fingerprint)).not.toContain('does work')
  })

  it('is stable when schema key order changes', () => {
    const a = fingerprintHeader(epochHeader(undefined, [toolSchema('t', { properties: { a: {}, b: {} } })]))
    const b = fingerprintHeader(epochHeader(undefined, [toolSchema('t', { properties: { b: {}, a: {} } })]))
    expect(a.tools[0]!.schemaHash).toBe(b.tools[0]!.schemaHash)
  })

  it('is distinct when the schema actually changes', () => {
    const a = fingerprintHeader(epochHeader(undefined, [toolSchema('t', { properties: { a: {} } })]))
    const b = fingerprintHeader(epochHeader(undefined, [toolSchema('t', { properties: { b: {} } })]))
    expect(a.tools[0]!.schemaHash).not.toBe(b.tools[0]!.schemaHash)
  })
})
