import { IFrameMessage, IFrameResponse, IThreadInitEvent } from '@annoto/widget-api';
import { ILog } from '../interfaces';
import { isAnnotoRelatedLti } from '../util';

export class DiscussionTopicHandler {
    private courseNumber: string | undefined;
    private topicNumber: string | undefined;
    private label: string | undefined;
    private observer: MutationObserver | undefined;
    private threadInitSubscriptionDone: Record<string, boolean> = {};

    constructor(private log: ILog) {
        /* empty */
    }

    init(): void {
        this.setCourseAndTopicNumbers();
        if (!this.courseNumber || !this.topicNumber) {
            return;
        }

        this.setLabel();
        const discussionHolder = document.getElementById('discussion_subentries');
        if (!discussionHolder) {
            return;
        }

        this.observer = new MutationObserver(() => this.handleDiscussionHolderMutations());
        this.observer.observe(discussionHolder, {
            attributes: true,
            childList: true,
            subtree: false,
        });
    }

    private setCourseAndTopicNumbers(): void {
        const currentLocation = window.location.href;
        const regex = /courses\/(\d+)\/discussion_topics\/(\d+)/;
        const matches = currentLocation.match(regex);

        if (matches) {
            [this.courseNumber, this.topicNumber] = [matches[1], matches[2]];
            this.log.info(`Course number: ${this.courseNumber}, Topic number: ${this.topicNumber}`);
        }
    }

    private setLabel(): void {
        this.label = document.querySelector<HTMLElement>(
            'header.discussion-section .discussion-title'
        )?.innerText;
        if (this.label) {
            this.log.info(`Discussion label: ${this.label}`);
        } else {
            this.log.info('Discussion label not found');
        }
    }

    private handleDiscussionHolderMutations(): void {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe, key) => {
            if (!iframe.src.includes('external_tools')) {
                return;
            }
            fetch(iframe.src, { method: 'GET' })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.text();
                })
                .then((data) => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(data, 'text/html');
                    if (isAnnotoRelatedLti(doc)) {
                        this.iframeHandler(iframe, key);
                    }
                })
                .catch((error) =>
                    this.log.error('There was a problem with the fetch operation:', error)
                );
        });
    }

    private iframeHandler(iframe: HTMLIFrameElement, key: number): void {
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
