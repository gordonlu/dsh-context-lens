/**
 * Test-only event builders over the real published `dsh-session` / `dsh-llm`
 * types, so the projection folds exactly what the harness would append.
 */

import type {
  AssistantMessage,
  ContentBlock,
  StreamChunk,
  TokenUsage,
  ToolResultMessage,
  ToolSchema,
  UserMessage,
} from '@deepseek-ai/dsh-llm'
import { CallId, MessageId } from '@deepseek-ai/dsh-llm'
import type { ContextLensProjection } from '../src/types.ts'
import { contextLensProjectionDefinition, type ContextLensState } from '../src/projection.ts'
import type { EpochHeader, SessionEvent, TurnEndReason } from '@deepseek-ai/dsh-session'

export function textBlock(text: string): ContentBlock {
  return { type: 'text', text }
}

export function userMessage(content: readonly ContentBlock[]): UserMessage {
  return {
    id: MessageId('u1'),
    role: 'user',
    content: [...content],
    source: { kind: 'user' },
  }
}

export function assistantMessage(content: readonly ContentBlock[]): AssistantMessage {
  return {
    id: MessageId('a1'),
    role: 'assistant',
    content: [...content],
    source: { kind: 'model', provider: 'deepseek', model: 'deepseek-chat' },
  }
}

export function toolResultMessage(toolCallId: string, content: readonly ContentBlock[]): ToolResultMessage {
  return {
    id: MessageId('t1'),
    role: 'user',
    content: [{ type: 'tool-result', toolCallId: CallId(toolCallId), content: [...content] }],
    source: { kind: 'tool', callId: CallId(toolCallId) },
  }
}

export function usage(
  inputTokens: number,
  outputTokens: number,
  extra: Pick<TokenUsage, 'cacheReadTokens' | 'cacheWriteTokens' | 'reasoningTokens'> = {},
): TokenUsage {
  return { inputTokens, outputTokens, ...extra }
}

export function streamChunkUsage(value: TokenUsage): StreamChunk {
  return { type: 'usage', usage: value }
}

export function toolSchema(name: string, extra: Record<string, unknown> = {}): ToolSchema {
  return { name, description: `${name} does work`, parameters: { type: 'object', properties: {}, ...extra } }
}

export function epochHeader(system: string | undefined, tools: ToolSchema[]): EpochHeader {
  return {
    config: { provider: 'deepseek', model: 'deepseek-chat' },
    ...system === undefined ? {} : { system },
    ...tools.length === 0 ? {} : { tools },
  }
}

export function turnEndReason(kind: TurnEndReason['kind']): TurnEndReason {
  return kind === 'aborted' ? { kind, reason: { kind: 'user' } }
    : kind === 'error' ? { kind, error: { message: 'boom', code: 'TEST' } }
      : { kind }
}

/** Minimal event shell; `data` narrowed by the per-type builders below. */
export interface EventShell {
  seq: number
  time?: number
}

export function ev<T extends SessionEvent['type']>(
  type: T,
  data: Extract<SessionEvent, { type: T }>['data'],
  shell: EventShell = { seq: 0 },
): Extract<SessionEvent, { type: T }> {
  return { type, seq: shell.seq, time: shell.time ?? 0, data } as Extract<SessionEvent, { type: T }>
}

/** Fold a full drive (header → step → message → turn end) into the projection. */
export function foldProjection(events: readonly SessionEvent[]): {
  state: ContextLensState
  view: ContextLensProjection
} {
  let state = contextLensProjectionDefinition.init()
  for (const event of events) {
    state = contextLensProjectionDefinition.apply(state, event)
  }
  return { state, view: contextLensProjectionDefinition.view(state) }
}