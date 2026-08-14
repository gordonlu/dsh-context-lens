/**
 * The recent-requests list: newest last, one card per request. The primary
 * line is the status (pill) with a dimmed turn:step tag; the secondary line
 * carries the model, the cache-reuse readout, and the structural-change /
 * cache-drop badges. The status carries the visual weight — the seq is
 * reference noise, not identity.
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { RequestRecord } from '../types.ts';
import { NS } from './locales.ts';
export interface RequestListProps {
    requests: readonly RequestRecord[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    t: PropsLocale<typeof NS>['t'];
}
export declare function RequestList(props: RequestListProps): import("react").JSX.Element;
