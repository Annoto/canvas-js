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
