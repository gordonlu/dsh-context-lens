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
export declare const CHAT_TARGET = "chat";
/**
 * Count the conversation's rendered Chat nodes from one snapshot value,
 * tolerating both the 0.1.5 target-store shape and the legacy top-level array.
 * Anything unreadable counts as zero, which only disables the scroll-to-latest
 * heuristic — never the panel.
 * @param snapshot - the `useSession` snapshot value (typed by an outdated package).
 * @returns the number of Chat nodes, or 0 when the snapshot exposes none.
 */
export declare function chatNodeCount(snapshot: unknown): number;
