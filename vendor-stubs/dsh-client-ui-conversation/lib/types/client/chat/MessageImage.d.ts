import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { ChatViewSlotProps } from '../contract/slots.ts';
/** Loads a session-authorized durable image URL. */
export type ImageLoader = (attachment: ImageAttachmentRef) => Promise<string>;
/** Compact history renderer with retryable loading and double-click original preview. */
export declare function MessageImage({ attachment, load, t }: {
    attachment: ImageAttachmentRef;
    load: ImageLoader;
    t: ChatViewSlotProps['t'];
}): import("react").JSX.Element;
/** Wrapping image group shared by user and assistant history. */
export declare function ImageGallery({ images, load, align, t }: {
    images: readonly {
        attachment: ImageAttachmentRef;
    }[];
    load: ImageLoader;
    align: 'start' | 'end';
    t: ChatViewSlotProps['t'];
}): import("react").JSX.Element | null;
//# sourceMappingURL=MessageImage.d.ts.map