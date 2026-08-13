/**
 * The overview strip: session counters plus the latest request's cache-reuse
 * readout, with an alarm banner when the latest request's cache reuse
 * dropped.
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { ContextLensSummary, RequestRecord } from '../types.ts';
import { NS } from './locales.ts';
export interface OverviewProps {
    summary: ContextLensSummary;
    latest: RequestRecord | undefined;
    t: PropsLocale<typeof NS>['t'];
}
export declare function Overview(props: OverviewProps): import("react").JSX.Element;
