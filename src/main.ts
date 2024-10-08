import { ILog } from './interfaces';
import { BUILD_ENV } from './constants';
import { DiscussionTopicHandler, SpeedGraderHandler } from './handlers';
import { inIframe } from './util';

export const VERSION = BUILD_ENV.version;
export const NAME = BUILD_ENV.name;
export const PUBLIC_PATH = BUILD_ENV.publicPath;

const log: ILog = {
    log: () => {
        /* empty */
    },
    info: console.info, // eslint-disable-line no-console
    warn: console.warn, // eslint-disable-line no-console
    error: console.error, // eslint-disable-line no-console
};
try {
    if (window.sessionStorage.getItem('canvasAnnotoDebug')) {
        log.log = console.debug; // eslint-disable-line no-console
    }
} catch (err) {
    /* empty */
}

class AnnotoCanvas {
    isSetup = false;

    setup(): void {
        if (inIframe()) {
            return;
        }
        const discussionTopicHandler = new DiscussionTopicHandler(log);
        const speedGraderHandler = new SpeedGraderHandler(log);
        if (this.isSetup) {
            log.warn('AnnotoCanvas: already setup');
            return;
        }
        this.isSetup = true;
        log.log('AnnotoCanvas: setup');

        const initializeHandlers = (): void => {
            log.log('AnnotoCanvas: init handlers');
            discussionTopicHandler.init();
            speedGraderHandler.init();
        };

        if (document.readyState === 'complete') {
            initializeHandlers();
        } else {
            window.addEventListener('load', initializeHandlers);
        }
    }
}

export const annotoCanvas = new AnnotoCanvas();
annotoCanvas.setup();
