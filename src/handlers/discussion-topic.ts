import { IFrameMessage, IFrameMessageWidgetSetCmd } from '@annoto/widget-api';
import { ILog } from '../interfaces';
import {
    annotoIframeHandle,
    delay,
    formatTagValue,
    getCanvasResourceUUID,
    isAnnotoRelatedIframe,
} from '../util';

export class DiscussionTopicHandler {
    private courseNumber!: string;
    private topicNumber!: string;
    private label: string | undefined;
    private observer: MutationObserver | undefined;
    private managedIframes = new Set<string>();

    constructor(private log: ILog) {
        /* empty */
    }

    async init(): Promise<void> {
        const discussionHolder = await this.detect();
        if (!discussionHolder) {
            this.log.log('AnnotoCanvas: Discussion topic not found');
            return;
        }
        this.log.info('AnnotoCanvas: Discussion detected');

        this.observer = new MutationObserver(() => this.mutationsHandle());
        this.observer.observe(discussionHolder, {
            attributes: true,
            childList: true,
            subtree: true,
        });
        this.mutationsHandle();
    }

    private async detect(): Promise<HTMLElement | null> {
        const currentLocation = window.location.href;
        const regex = /courses\/(\d+)\/discussion_topics\/(\d+)/;
        const matches = currentLocation.match(regex);

        if (matches) {
            [this.courseNumber, this.topicNumber] = [matches[1], matches[2]];
        }

        if (!this.courseNumber || !this.topicNumber) {
            return null;
        }

        this.label =
            document.querySelector<HTMLElement>(
                '#discussion_topic .discussion-header-content .discussion-title'
            )?.innerText ||
            Array.from<HTMLLinkElement>(document.querySelectorAll('#breadcrumbs li a')).filter(
                (el) => el.href?.match(regex)
            )[0]?.innerText;

        if (!this.label) {
            this.log.warn('AnnotoCanvas: Label not found');
            return null;
        }

        this.log.log(
            `AnnotoCanvas: Course number: ${this.courseNumber}, Topic number: ${this.topicNumber}, Label: ${this.label}`
        );

        const getDiscussionHolder = (): HTMLElement | null =>
            document.getElementById('discussion_subentries') ||
            document.querySelector('#content [data-testid=discussion-root-entry-container]');

        let holderEl = getDiscussionHolder();
        let retries = 0;
        while (!holderEl && retries < 50) {
            await delay(200); // eslint-disable-line no-await-in-loop
            holderEl = getDiscussionHolder();
            retries += 1;
        }
        return holderEl;
    }

    private mutationsHandle(): void {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe) => {
            const key = getCanvasResourceUUID(iframe);
            if (!key) {
                return;
            }
            if (this.managedIframes.has(key)) {
                return;
            }
            this.managedIframes.add(key);
            isAnnotoRelatedIframe(iframe, this.log).then((isRelated) => {
                if (isRelated) {
                    this.iframeHandle(iframe, key);
                }
            });
        });
    }

    private iframeHandle(iframe: HTMLIFrameElement, key: string): void {
        const subscriptionId = `discussion_topic_thread_init_${key}`;
        const { courseNumber, topicNumber } = this;

        this.log.info(
            `AnnotoCanvas: Discussion handling tool ${key} for course ${courseNumber}, topic ${topicNumber}`
        );

        annotoIframeHandle({
            iframe,
            key,
            log: this.log,
            subscriptionId,
            onSubscribe: () => {
                /* empty */
            },
            onThreadInit: (ev) => {
                const tagMsg: IFrameMessageWidgetSetCmd<'thread_tag'> = {
                    action: 'thread_tag',
                    widget_index: ev.widget_index,
                    data: {
                        value: formatTagValue({ courseNumber, topicNumber }),
                        label: this.label,
                    },
                };
                const msg: IFrameMessage<'widget_set_cmd'> = {
                    aud: 'annoto_widget',
                    id: `discussion_topic_tag_set_${key}`,
                    action: 'widget_set_cmd',
                    data: tagMsg,
                };
                iframe.contentWindow?.postMessage(JSON.stringify(msg), '*');
            },
            onEvent: () => {
                /* empty */
            },
        });
    }
}
