/**
 * The session status strip: does this session need attention? Healthy shows
 * two green marks plus the analyzed-request count; the first cache drop or
 * structural change flips the marks to alarm-style counts.
 */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { ContextLensSummary } from '../types.ts';
import { NS } from './locales.ts';
export interface OverviewProps {
    summary: ContextLensSummary;
    t: PropsLocale<typeof NS>['t'];
}
export declare function Overview(props: OverviewProps): import("react").JSX.Element;
