/**
 * The recent-requests list: newest last, one row per request. Rows show the
 * request status, its cache-reuse readout (or `usage n/a`), and a marker
 * when the request's header changed structurally against its predecessor.
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
