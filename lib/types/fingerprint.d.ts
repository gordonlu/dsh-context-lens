/**
 * Deterministic request-header fingerprinting: canonical JSON + sha256 for
 * system prompts and tool schemas, plus the fixed-density heuristic token
 * pricing shared by the surface estimate and per-tool sizing. Only hashes,
 * byte sizes, and estimates are ever retained — never prompt or schema text.
 *
 * @module dsh-context-lens/fingerprint
 */
import type { ContentBlock, ToolSchema } from '@deepseek-ai/dsh-llm';
import type { EpochHeader } from '@deepseek-ai/dsh-session';
import type { HeaderFingerprint } from './types.ts';
/** Fixed text-density heuristic, mirroring the harness token-meter's pricing. */
export declare const CHARS_PER_TOKEN = 4;
/** Per-block structural overhead for JSON framing and type tags. */
export declare const BLOCK_OVERHEAD = 4;
/**
 * Deterministically serialize any JSON value: object keys are sorted
 * recursively, arrays keep their order, primitives are verbatim. A stable
 * serialization is the precondition for stable hashes — key order changes
 * must not register as a schema change.
 * @param value - the JSON value to serialize.
 * @returns the canonical JSON text.
 */
export declare function canonicalJson(value: unknown): string;
/**
 * sha256 hex digest of a text.
 * @param text - the text to hash.
 * @returns the hex digest.
 */
export declare function hashText(text: string): string;
/**
 * Hash of the canonical serialization of a JSON value.
 * @param value - the JSON value to hash.
 * @returns the hex digest.
 */
export declare function hashValue(value: unknown): string;
/**
 * Fixed-density heuristic token price of a text.
 * @param text - the text to price.
 * @returns the heuristic token count.
 */
export declare function estimateTextTokens(text: string): number;
/**
 * Heuristic token price of a tool schema under the fixed density.
 * @param schema - the tool schema to price.
 * @returns the heuristic token count.
 */
export declare function estimateSchemaTokens(schema: ToolSchema): number;
/**
 * Heuristic token price of one content block, mirroring the harness
 * token-meter heuristic (4 chars per token plus per-block overhead;
 * unknown block types fall back to a conservative structural JSON price).
 * @param block - the block to price.
 * @returns the heuristic token count.
 */
export declare function estimateBlockTokens(block: ContentBlock): number;
/**
 * Heuristic token price of a block list.
 * @param blocks - the blocks to price.
 * @returns the heuristic token count.
 */
export declare function estimateBlocksTokens(blocks: readonly ContentBlock[]): number;
/** Fingerprint of an absent header: no config hash, empty tool set. */
export declare const EMPTY_HEADER: HeaderFingerprint;
/**
 * Reduce a canonical request header to its fingerprint. `undefined` (a
 * header-less log) yields {@link EMPTY_HEADER}. The system text is hashed and
 * measured in bytes; every tool is fingerprinted individually, and the tool
 * set carries a whole-set hash for O(1) change detection.
 * @param header - the canonical header, or undefined before any request.
 * @returns the fingerprint.
 */
export declare function fingerprintHeader(header: EpochHeader | undefined): HeaderFingerprint;
