import {
    IAnnotoApi,
    IConfig,
    IFrameMessage,
    IFrameResponse,
} from '@annoto/widget-api';
import { BUILD_ENV } from './constants';


export const VERSION = BUILD_ENV.version;
export const NAME = BUILD_ENV.name;
export const PUBLIC_PATH = BUILD_ENV.publicPath;

let log: Pick<Console, 'log' | 'info' | 'warn' | 'error'> = {
    log: () => {
        /* empty */
    },
    info: console.info, // eslint-disable-line no-console
    warn: console.warn, // eslint-disable-line no-console
    error: console.error, // eslint-disable-line no-console
};
try {
    if (window.sessionStorage.getItem('canvasAnnotoDebug')) {
        log = console;
    }
} catch (err) {
    /* empty */
}

class AnnotoCanvas {
    isSetup = false;

    setup(): void {
        if (this.isSetup) {
            log.warn('AnnotoCanvas: already setup');
            return;
        }
        log.info('AnnotoCanvas: setup');
        this.isSetup = true;

        // TODO
    }
}

export const annotoCanvas = new AnnotoCanvas();
annotoCanvas.setup();
