/**
 * The request inspector: everything the projection knows about one request —
 * meta, provider usage, header fingerprints, the diff against its
 * predecessor, and (on a cache drop) the rule-ranked list of coincident
 * changes with the correlation disclaimer.
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { RequestRecord } from '../types.ts';
import { NS } from './locales.ts';
export interface RequestInspectorProps {
    request: RequestRecord | null;
    t: PropsLocale<typeof NS>['t'];
}
export declare function RequestInspector(props: RequestInspectorProps): import("react").JSX.Element;
