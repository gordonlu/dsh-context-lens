/**
 * The recent-requests list: newest first, one card per request, each card
 * summarized to ONE line of meaning — the session-global ordinal, the
 * change tag (stable / cache drop / tools changed / …), and the cache
 * readout. Unchanged requests are hidden by default so the list answers
 * "where are the interesting requests?" instead of scrolling 358 identical
 * rows.
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { RequestRecord } from '../types.ts';
import { NS } from './locales.ts';
export interface RequestListProps {
    requests: readonly RequestRecord[];
    totalRequests: number;
    selectedId: string | null;
    onSelect: (id: string) => void;
    t: PropsLocale<typeof NS>['t'];
}
export declare function RequestList(props: RequestListProps): import("react").JSX.Element;
