/**
 * Browser half of dsh-context-lens: registers one entry into the
 * `conversation.view` slot. The view is a pure reader of the `contextLens`
 * session projection — no service, no store, no per-session state beyond
 * what the projection already carries. Registration rides the slot service's
 * effect wrapper, so plugin unload removes the tab.
 *
 * @module dsh-context-lens/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the 'conversation.view' SlotMap row must be in the program for
// the register call to type (declared by the slot's owning package).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { ContextView } from './ContextView.tsx'
import { en, NS, zh } from './locales.ts'

/** Required services: the conversation slot registry and the locale service. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: install the dictionaries and register the Context Lens
 * view tab.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'context-lens: dictionaries')
  // Registration-time text (the view tab label) reads through the bound
  // translate as a thunk, so it follows the active locale without
  // re-registration.
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'context-lens',
    order: 30,
    locale: NS,
    label: () => t('view.context'),
  }, ContextView))
}
