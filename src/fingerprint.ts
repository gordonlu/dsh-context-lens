/**
 * Deterministic request-header fingerprinting: canonical JSON + sha256 for
 * system prompts and tool schemas, plus the fixed-density heuristic token
 * pricing shared by the surface estimate and per-tool sizing. Only hashes,
 * byte sizes, and estimates are ever retained — never prompt or schema text.
 *
 * @module dsh-context-lens/fingerprint
 */

import { createHash } from 'node:crypto'
import type { ContentBlock, ToolSchema } from '@deepseek-ai/dsh-llm'
import type { EpochHeader } from '@deepseek-ai/dsh-session'
import type { HeaderFingerprint, ToolFingerprint } from './types.ts'

/** Fixed text-density heuristic, mirroring the harness token-meter's pricing. */
export const CHARS_PER_TOKEN = 4

/** Per-block structural overhead for JSON framing and type tags. */
export const BLOCK_OVERHEAD = 4

/**
 * Deterministically serialize any JSON value: object keys are sorted
 * recursively, arrays keep their order, primitives are verbatim. A stable
 * serialization is the precondition for stable hashes — key order changes
 * must not register as a schema change.
 * @param value - the JSON value to serialize.
 * @returns the canonical JSON text.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => canonicalJson(item)).join(',')}]`
  }
  const record = value as Record<string, unknown>
  const entries = Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
  return `{${entries.join(',')}}`
}

/**
 * sha256 hex digest of a text.
 * @param text - the text to hash.
 * @returns the hex digest.
 */
export function hashText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/**
 * Hash of the canonical serialization of a JSON value.
 * @param value - the JSON value to hash.
 * @returns the hex digest.
 */
export function hashValue(value: unknown): string {
  return hashText(canonicalJson(value))
}

/**
 * Fixed-density heuristic token price of a text.
 * @param text - the text to price.
 * @returns the heuristic token count.
 */
export function estimateTextTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN) + BLOCK_OVERHEAD
}

/**
 * Heuristic token price of a tool schema under the fixed density.
 * @param schema - the tool schema to price.
 * @returns the heuristic token count.
 */
export function estimateSchemaTokens(schema: ToolSchema): number {
  return Math.ceil(JSON.stringify(schema).length / CHARS_PER_TOKEN) + BLOCK_OVERHEAD
}

/**
 * Heuristic token price of one content block, mirroring the harness
 * token-meter heuristic (4 chars per token plus per-block overhead;
 * unknown block types fall back to a conservative structural JSON price).
 * @param block - the block to price.
 * @returns the heuristic token count.
 */
export function estimateBlockTokens(block: ContentBlock): number {
  switch (block.type) {
    case 'text':
    case 'reasoning':
      return Math.ceil(block.text.length / CHARS_PER_TOKEN) + BLOCK_OVERHEAD
    case 'tool-call':
      return Math.ceil(block.name.length / CHARS_PER_TOKEN)
        + Math.ceil(block.arguments.length / CHARS_PER_TOKEN)
        + BLOCK_OVERHEAD
    case 'tool-result':
      return estimateBlocksTokens(block.content) + BLOCK_OVERHEAD
    default:
      return BLOCK_OVERHEAD + Math.ceil(JSON.stringify(block).length / CHARS_PER_TOKEN)
  }
}

/**
 * Heuristic token price of a block list.
 * @param blocks - the blocks to price.
 * @returns the heuristic token count.
 */
export function estimateBlocksTokens(blocks: readonly ContentBlock[]): number {
  let tokens = 0
  for (const block of blocks) tokens += estimateBlockTokens(block)
  return tokens
}

/** Fingerprint of an absent header: no config hash, empty tool set. */
export const EMPTY_HEADER: HeaderFingerprint = { configHash: '', tools: [] }

/**
 * Reduce a canonical request header to its fingerprint. `undefined` (a
 * header-less log) yields {@link EMPTY_HEADER}. The system text is hashed and
 * measured in bytes; every tool is fingerprinted individually, and the tool
 * set carries a whole-set hash for O(1) change detection.
 * @param header - the canonical header, or undefined before any request.
 * @returns the fingerprint.
 */
export function fingerprintHeader(header: EpochHeader | undefined): HeaderFingerprint {
  if (header === undefined) return EMPTY_HEADER
  const tools = (header.tools ?? []).map((schema): ToolFingerprint => ({
    name: schema.name,
    schemaHash: hashValue(schema),
    schemaBytes: canonicalJson(schema).length,
    estimatedTokens: estimateSchemaTokens(schema),
  }))
  return {
    configHash: hashValue(header.config),
    ...header.config.provider === undefined ? {} : { provider: header.config.provider },
    ...header.config.model === undefined ? {} : { model: header.config.model },
    ...header.system === undefined ? {} : {
      systemHash: hashText(header.system),
      systemBytes: Buffer.byteLength(header.system, 'utf8'),
    },
    ...tools.length === 0 ? {} : {
      toolsHash: hashValue(tools.map(tool => [tool.name, tool.schemaHash])),
      toolCount: tools.length,
    },
    tools,
  }
}
