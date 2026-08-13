/**
 * Browser half of dsh-context-lens: registers one entry into the
 * `conversation.view` slot. The view is a pure reader of the `contextLens`
 * session projection — no service, no store, no per-session state beyond
 * what the projection already carries. Registration rides the slot service's
 * effect wrapper, so plugin unload removes the tab.
 *
 * @module dsh-context-lens/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** Required services: the conversation slot registry and the locale service. */
export declare const inject: string[];
/**
 * Client plugin body: install the dictionaries and register the Context Lens
 * view tab.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
