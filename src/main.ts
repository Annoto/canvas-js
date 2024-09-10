import { Log } from 'interfaces';
import { BUILD_ENV } from './constants';
import { DiscussionTopicHandler, SpeedGraderHandler } from './discussions';

export const VERSION = BUILD_ENV.version;
export const NAME = BUILD_ENV.name;
export const PUBLIC_PATH = BUILD_ENV.publicPath;

let log: Log = {
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
        const discussionTopicHandler = new DiscussionTopicHandler(log);
        const speedGraderHandler = new SpeedGraderHandler(log);
        if (this.isSetup) {
            log.warn('AnnotoCanvas: already setup');
            return;
        }
        log.info('AnnotoCanvas: setup');

        const initializeHandlers = () => {
            log.info('AnnotoCanvas: load');
            discussionTopicHandler.init();
            speedGraderHandler.init();
        };

        if (document.readyState === 'complete') {
            initializeHandlers();
        } else {
            window.addEventListener('load', initializeHandlers);
        }
        this.isSetup = true;
    }
}

export const annotoCanvas = new AnnotoCanvas();
annotoCanvas.setup();
