/**
 * The request inspector: change-first. The head names the request and its
 * one-line status; the primary readout shows cache reuse (with the delta vs
 * the predecessor), new uncached input, and the estimated context surface;
 * the comparison panel answers "what changed vs the previous request" line
 * by line; a conclusion line says whether anything looks cache-impacting.
 * Raw usage buckets, header hashes, and the full tool list live behind the
 * technical-details fold.
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { RequestRecord } from '../types.ts';
import { NS } from './locales.ts';
export interface RequestInspectorProps {
    request: RequestRecord | null;
    /** Session-global ordinal of this request (head "#N"). */
    ordinal: number;
    /** Session-global ordinal of the previous request (for the compare title). */
    previousOrdinal: number | null;
    t: PropsLocale<typeof NS>['t'];
}
export declare function RequestInspector(props: RequestInspectorProps): import("react").JSX.Element;
