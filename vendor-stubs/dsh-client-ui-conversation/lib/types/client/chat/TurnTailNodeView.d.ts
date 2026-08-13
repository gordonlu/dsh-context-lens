import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots';
import type { ChatNodeViewProps } from '../contract/slots.ts';
type TurnTailNodeViewProps = ChatNodeViewProps<'turn-tail'> & PropsRenderSlots<'conversation.chat.turnTail'>;
/** Turn-local actions and feature tail over the Location index, independent of Assistant placement. */
export declare const TurnTailNodeView: import("react").MemoExoticComponent<({ node, openFile, forkAt, renderSlotChain, t, useSession, }: TurnTailNodeViewProps) => import("react").JSX.Element | null>;
export {};
//# sourceMappingURL=TurnTailNodeView.d.ts.map