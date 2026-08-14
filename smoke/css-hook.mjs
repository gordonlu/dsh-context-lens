/**
 * css-hook.mjs — node loader hook returning empty CSS modules.
 *
 * Lets smoke scripts load real client packages whose source imports
 * `*.module.css` (their build pipeline inlines CSS; plain node cannot).
 * Class maps are empty — fine for registration-only smokes that never
 * render components.
 */

export async function load(url, context, nextLoad) {
  if (url.endsWith('.css') || url.endsWith('.module.css')) {
    return { format: 'module', source: 'export default {}', shortCircuit: true }
  }
  return nextLoad(url, context)
}
