import { IFrameMessage, IFrameResponse, IThreadInitEvent } from '@annoto/widget-api';
import { ILog } from './interfaces';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = (func: (...args: any[]) => void, wait = 0): ((...args: any[]) => void) => {
    let timer: ReturnType<typeof setTimeout>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (...args: any[]): void => {
        clearTimeout(timer);
        timer = setTimeout(func, wait, ...args);
    };
};

export const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

const isAnnotoRelatedDoc = (doc: Document, log: ILog): boolean => {
    const inputElement: HTMLInputElement | null = doc.querySelector('#target_link_uri');
    if (!inputElement) {
        return false;
    }

    log.log('AnnotoCanvas: evaluating:', inputElement.value);

    const ltiValueRegExp = /annoto.*lti\/embed\/launch/;
    if (ltiValueRegExp.test(inputElement.value)) {
        return true;
    }
    const kalturaValueRegExp = /browseandembed\/index\/media\/entryid/;
    if (kalturaValueRegExp.test(inputElement.value)) {
        return true;
    }

    return false;
};

export const isAnnotoRelatedIframe = async (
    iframe: HTMLIFrameElement,
    log: ILog
): Promise<boolean> => {
    try {
        if (!iframe.src.includes('external_tools')) {
            return false;
        }
        const response = await fetch(iframe.src, { method: 'GET' });
        if (!response.ok) {
            log.log('AnnotoCanvas: not able to fatch iframe src: ', iframe.src);
            return false;
        }
        const data = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(data, 'text/html');
        return isAnnotoRelatedDoc(doc, log);
    } catch (err) {
        log.error('AnnotoCanvas: error:', err);
        return false;
    }
};

export const getCanvasResourceUUID = (el: HTMLIFrameElement): string | null => {
    try {
        if (!el.src) {
            return null;
        }
        const url = new URL(el.src);
        const params = new URLSearchParams(url.search);
        return params.get('resource_link_lookup_uuid');
    } catch (err) {
        return null;
    }
};

export const annotoIframeHandle = ({
    iframe,
    key,
    log,
    subscriptionId,
    onSubscribe,
    onThreadInit,
    onEvent,
    pollInterval = 100,
}: {
    iframe: HTMLIFrameElement;
    key: string;
    subscriptionId: string;
    log: ILog;
    onSubscribe: () => void;
    onThreadInit: (ev: IThreadInitEvent) => void;
    onEvent: (data: IFrameResponse<'event'>) => void;
    /**
     * @default 100
     */
    pollInterval?: number;
}): void => {
    log.info(`AnnotoCanvas: handling tool ${key}:`, iframe.src);

    let subscriptionDone = false;
    window.addEventListener(
        'message',
        (ev: MessageEvent) => {
            let parsedData: IFrameResponse | null = null;
            try {
                parsedData = JSON.parse(ev.data);
            } catch (e) {
                /* empty */
            }
            if (!parsedData) {
                return;
            }
            try {
                if (parsedData.aud !== 'annoto_widget' || parsedData.id !== subscriptionId) {
                    return;
                }
                if (parsedData.err) {
                    log.warn(`AnnotoCanvas: error received from tool ${key}:`, parsedData.err);
                    return;
                }

                if (parsedData.type === 'subscribe') {
                    log.log(`AnnotoCanvas: subscribed to thread init for iframe ${key}`);
                    subscriptionDone = true;
                    onSubscribe();
                    return;
                }
                if (parsedData.type === 'event' && parsedData.data) {
                    log.log(`AnnotoCanvas: event received for tool ${key}:`, parsedData.data);
                    onEvent(parsedData as IFrameResponse<'event'>);
                    if (parsedData.data.eventName === 'thread_init') {
                        onThreadInit(parsedData.data.eventData as IThreadInitEvent);
                    }
                }
            } catch (e) {
                log.error('Error handling message event:', e);
            }
        },
        false
    );

    const subscribeToThreadInit = (): void => {
        if (subscriptionDone) {
            return;
        }

        const msg: IFrameMessage = {
            aud: 'annoto_widget',
            id: subscriptionId,
            action: 'subscribe',
            data: 'thread_init',
        };

        iframe.contentWindow?.postMessage(JSON.stringify(msg), '*');
        setTimeout(subscribeToThreadInit, pollInterval);
    };

    subscribeToThreadInit();
};
