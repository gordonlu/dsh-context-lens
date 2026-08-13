/**
 * The Context Lens conversation view: a three-part reader over the
 * `contextLens` projection — an overview strip, the recent-requests list,
 * and the inspector for the selected request. Selection is component-local;
 * everything else arrives through the framework `useProjection` seat.
 */
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
export type ContextLensViewProps = ConvViewProps & PropsLocale<typeof NS>;
export declare function ContextView(props: ContextLensViewProps): import("react").JSX.Element;
