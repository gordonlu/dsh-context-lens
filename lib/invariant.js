//#region src/invariant.ts
const PACKAGE_NAME = "dsh-context-lens";
/** Cordis companion plugin name. */
const name = "context-lens-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
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
const install = () => {};
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
