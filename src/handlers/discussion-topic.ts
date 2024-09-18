import { IFrameMessage, IFrameResponse, IThreadInitEvent } from '@annoto/widget-api';
import { ILog } from '../interfaces';
import { getCanvasResourceUUID, isAnnotoRelatedIframe } from '../util';

export class DiscussionTopicHandler {
    private courseNumber: string | undefined;
    private topicNumber: string | undefined;
    private label: string | undefined;
    private observer: MutationObserver | undefined;
    private threadInitSubscriptionDone: Record<string, boolean> = {};
    private managedIframes = new Set<string>();

    constructor(private log: ILog) {
        /* empty */
    }

    init(): void {
        const discussionHolder = this.detect();
        if (!discussionHolder) {
            this.log.log('AnnotoCanvas: Discussion topic not found');
            return;
        }
        this.log.info('AnnotoCanvas: Discussion topic detected');

        this.observer = new MutationObserver(() => this.mutationsHandle());
        this.observer.observe(discussionHolder, {
            attributes: true,
            childList: true,
            subtree: true,
        });
        this.mutationsHandle();
    }

    private detect(): HTMLElement | null {
        const currentLocation = window.location.href;
        const regex = /courses\/(\d+)\/discussion_topics\/(\d+)/;
        const matches = currentLocation.match(regex);

        if (matches) {
            [this.courseNumber, this.topicNumber] = [matches[1], matches[2]];
        }

        this.label = document.querySelector<HTMLElement>(
            '#discussion_topic .discussion-header-content .discussion-title'
        )?.innerText;

        if (!this.courseNumber || !this.topicNumber || !this.label) {
            return null;
        }

        this.log.log(
            `AnnotoCanvas: Course number: ${this.courseNumber}, Topic number: ${this.topicNumber}, Label: ${this.label}`
        );

        return document.getElementById('discussion_subentries');
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
        this.log.info(`AnnotoCanvas: handling resource ${key}:`, iframe.src);
        const subscriptionId = `thread_init_subscription_discussion_topic_${key}`;

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
                        this.log.error(`Error received from iframe ${key}:`, parsedData.err);
                        return;
                    }

                    if (parsedData.type === 'subscribe') {
                        this.threadInitSubscriptionDone[subscriptionId] = true;
                        this.log.info(`Subscription done for iframe ${key}`);
                        return;
                    }
                    if (parsedData.type === 'event' && parsedData.data) {
                        this.log.info(`Event received for iframe ${key}:`, parsedData.data);
                        if (parsedData.data.eventName === 'thread_init') {
                            const msg: IFrameMessage = {
                                aud: 'annoto_widget',
                                id: `video_tag_set_${key}`,
                                action: 'widget_set_cmd',
                                data: {
                                    action: 'thread_tag',
                                    ...(parsedData.data.eventData as IThreadInitEvent),
                                    data: {
                                        value: `canvas_discussion_${this.courseNumber}_${this.topicNumber}`,
                                        label: this.label,
                                    },
                                },
                            };
                            iframe.contentWindow?.postMessage(JSON.stringify(msg), '*');
                        }
                    }
                } catch (e) {
                    this.log.error('Error handling message event:', e);
                }
            },
            false
        );

        this.subscribeToThreadInit(iframe, subscriptionId);
    }

    private subscribeToThreadInit(iframe: HTMLIFrameElement, subscriptionId: string): void {
        if (this.threadInitSubscriptionDone[subscriptionId]) {
            return;
        }

        const msg: IFrameMessage = {
            aud: 'annoto_widget',
            id: subscriptionId,
            action: 'subscribe',
            data: 'thread_init',
        };

        iframe.contentWindow?.postMessage(JSON.stringify(msg), '*');
        setTimeout(() => this.subscribeToThreadInit(iframe, subscriptionId), 200);
    }
}
