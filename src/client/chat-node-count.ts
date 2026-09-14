/**
 * Chat-node counting for the conversation snapshot, isolated from the view so
 * it stays unit-testable (the view imports CSS Modules, which a node-side test
 * runner cannot load).
 *
 * Why this is defensive rather than a typed field read: the 0.1.5 harness
 * rebuilt `ConversationSnapshot` into a target-neutral store
 * (`views` + `activeTargets`), with the Chat target publishing its node order
 * under `views.get('chat')`. The type this plugin sees for `useSession`,
 * however, comes from `@deepseek-ai/dsh-client-runtime`, whose published
 * `0.1.1-rc.2` still declares the *old* top-level `nodes` array. A typed read
 * therefore compiles and then throws at runtime inside the slot entry —
 * exactly the 0.3.0 regression this module exists to prevent.
 *
 * @module dsh-context-lens/client/chat-node-count
 */

/** The Chat target id registered by the conversation shell. */
export const CHAT_TARGET = 'chat'

/** Minimal shape of the Chat target's snapshot under the 0.1.5 contract. */
interface ChatViewSnapshot {
  readonly order?: readonly unknown[]
}

/** The pre-0.1.5 top-level node array, still declared by the published types. */
interface LegacyConversationSnapshot {
  readonly nodes?: readonly unknown[]
}

/**
 * Count the conversation's rendered Chat nodes from one snapshot value,
 * tolerating both the 0.1.5 target-store shape and the legacy top-level array.
 * Anything unreadable counts as zero, which only disables the scroll-to-latest
 * heuristic — never the panel.
 * @param snapshot - the `useSession` snapshot value (typed by an outdated package).
 * @returns the number of Chat nodes, or 0 when the snapshot exposes none.
 */
export function chatNodeCount(snapshot: unknown): number {
  const views = (snapshot as { views?: { get?: (target: string) => unknown } } | null | undefined)?.views
  if (typeof views?.get === 'function') {
    const chat = views.get(CHAT_TARGET) as ChatViewSnapshot | undefined
    if (Array.isArray(chat?.order)) return chat.order.length
  }
  const legacy = (snapshot as LegacyConversationSnapshot | null | undefined)?.nodes
  return Array.isArray(legacy) ? legacy.length : 0
}
