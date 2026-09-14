/**
 * Test-only event builders over the real published `dsh-session` / `dsh-llm`
 * types, so the projection folds exactly what the harness would append.
 */

import type {
  AssistantMessage,
  ContentBlock,
  SystemMessage,
  TokenUsage,
  ToolResultMessage,
  ToolSchema,
  UserMessage,
} from '@deepseek-ai/dsh-llm'
import { MessageId, ToolCallId } from '@deepseek-ai/dsh-llm'
import type { ContextLensProjection } from '../src/types.ts'
import { contextLensProjectionDefinition, type ContextLensState } from '../src/projection.ts'
import type { EpochHeader, SessionEvent, SessionHeader, TurnEndReason } from '@deepseek-ai/dsh-session'
import { SESSION_FORMAT_VERSION, SessionId, SessionLogOffset } from '@deepseek-ai/dsh-session'

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

/**
 * The model-visible system prompt as the harness commits it: a history node,
 * not a header field.
 * @param content - the prompt's blocks.
 * @returns the system message.
 */
export function systemMessage(content: readonly ContentBlock[]): SystemMessage {
  return {
    id: MessageId('s1'),
    role: 'system',
    content: [...content],
    source: { kind: 'plugin', plugin: 'test' },
  }
}

export function toolResultMessage(toolCallId: string, content: readonly ContentBlock[]): ToolResultMessage {
  return {
    id: MessageId('t1'),
    role: 'user',
    content: [{ type: 'tool-result', toolCallId: ToolCallId(toolCallId), content: [...content] }],
    source: { kind: 'tool', callId: ToolCallId(toolCallId) },
  }
}

export function usage(
  inputTokens: number,
  outputTokens: number,
  extra: Pick<TokenUsage, 'cacheReadTokens' | 'cacheWriteTokens' | 'reasoningTokens'> = {},
): TokenUsage {
  return { inputTokens, outputTokens, ...extra }
}

export function toolSchema(name: string, extra: Record<string, unknown> = {}): ToolSchema {
  return { name, description: `${name} does work`, parameters: { type: 'object', properties: {}, ...extra } }
}

/**
 * A canonical request header: the call config plus the assembled tool set.
 * The model-visible system prompt is deliberately absent — the harness keeps
 * it in history as a `system/message` node, which the projection tracks
 * separately and folds into each record's header.
 * @param tools - the assembled tool schemas; omit for a tool-less request.
 * @returns the header.
 */
export function epochHeader(tools: ToolSchema[] = []): EpochHeader {
  return {
    config: { provider: 'deepseek', model: 'deepseek-chat' },
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

/** A committed `system/message` node carrying the model-visible prompt. */
export function systemMessageEvent(
  text: string,
  shell: EventShell = { seq: 0 },
  turn = 1,
  step = 1,
): Extract<SessionEvent, { type: 'system/message' }> {
  return ev('system/message', { turn, step, message: systemMessage([textBlock(text)]) }, shell)
}

/** Immutable session metadata the projection's `init` folds from. */
export function sessionHeader(): SessionHeader {
  return {
    version: SESSION_FORMAT_VERSION,
    id: SessionId('lens-test'),
    createdAt: 0,
    isSeeded: false,
  }
}

/** Fold a full drive (header → step → message → turn end) into the projection. */
export function foldProjection(events: readonly SessionEvent[]): {
  state: ContextLensState
  view: ContextLensProjection
} {
  let state = contextLensProjectionDefinition.init(sessionHeader(), SessionLogOffset(0))
  for (const event of events) {
    state = contextLensProjectionDefinition.apply(state, event)
  }
  return { state, view: contextLensProjectionDefinition.wire.view(state) }
}
