/**
 * Package-owned invariant companion for `dsh-context-lens`.
 * @module dsh-context-lens/invariant
 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = 'dsh-context-lens'

/** Cordis companion plugin name. */
export const name = 'context-lens-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the projection's contracts — the Object.is
 * no-op gate for irrelevant events, the replay-consistency equivalence
 * (incremental live fold ≡ full log replay), the one-record-per-step
 * lifecycle, and the final-usage-wins replacement — are enforced inside the
 * pure `apply` fold and proven by its replay/consistency spec; the drive
 * relation (every committed `session/event` passes the fold) would require
 * re-running the drive to check, duplicating the implementation rather than
 * detecting drift, and the served-value relation (every served `contextLens`
 * key reflects a live registration) lives on the projection registry's wire
 * path, which emits no cordis event this companion could observe; the
 * registry spec asserts it.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
