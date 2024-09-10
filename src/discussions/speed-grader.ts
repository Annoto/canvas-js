import { IFrameMessage, IFrameResponse, IThreadInitEvent } from '@annoto/widget-api';

const USER_CONTENT_LOADED_INTERVAL = 200;
const MAX_ATTEMPTS = 900;

export class SpeedGraderHandler {
    private studentId: string = '';
    private observer: MutationObserver | undefined;
    private threadInitSubscriptionDone: Record<string, boolean> = {};

    constructor(private log: Pick<Console, 'log' | 'info' | 'warn' | 'error'>) {
        /* empty */
    }

    init(): void {
        this.setStudentId();
        if (!this.studentId) {
            return;
        }
        this.log.info(`Student ID: ${this.studentId}`);

        const iframeHolder = document.getElementById('iframe_holder');
        if (!iframeHolder) {
            this.log.info('Iframe holder not found');
            return;
        }

        this.observer = new MutationObserver(() => this.handleIframeHolderMutations());
        this.observer.observe(iframeHolder, { attributes: true, childList: true, subtree: false });
    }

    private setStudentId(): void {
        const currentLocation = window.location.href;
        const regex = /speed_grader.*student_id=(\d+)/;
        const match = currentLocation.match(regex);

        if (match) {
            const [, studentId] = match;
            this.studentId = studentId;
        }
    }

    private handleIframeHolderMutations(): void {
        const iframe = document.getElementById('speedgrader_iframe') as HTMLIFrameElement;
        if (!iframe) {
            this.log.info('Speedgrader iframe not found');
            return;
        }

        const dom = iframe.contentDocument;
        if (!dom) {
            this.log.info('Cannot access iframe content document');
            return;
        }

        let attempt = 0;
        const userContentLoadInterval = setInterval(() => {
            const userContent = iframe.contentDocument?.getElementsByClassName('user_content');
            if (userContent?.length) {
                this.userContentLoadedHandler(iframe);
                clearInterval(userContentLoadInterval);
            } else {
                attempt += 1;
                if (attempt >= MAX_ATTEMPTS) {
                    this.log.info('Failed to load user content after maximum attempts');
                    clearInterval(userContentLoadInterval);
                }
            }
        }, USER_CONTENT_LOADED_INTERVAL);
    }

    private userContentLoadedHandler(speedgraderIframe: HTMLIFrameElement): void {
        const dom = speedgraderIframe.contentDocument;
        if (!dom) {
            this.log.info('Cannot access iframe content document');
            return;
        }
        const discussionLinkElement = dom.getElementById(
            'discussion_view_link'
        ) as HTMLAnchorElement;
        if (!discussionLinkElement) {
            this.log.info('Discussion link not found');
            return;
        }

        const discussionTopicLink = discussionLinkElement.href;
        const regex = /courses\/(\d+)\/discussion_topics\/(\d+)/;
        const matches = discussionTopicLink.match(regex);
        if (!matches) {
            this.log.info('Discussion topic details not found');
            return;
        }

        const courseNumber = matches[1];
        const topicNumber = matches[2];

        const iframes = dom.querySelectorAll('iframe');
        iframes.forEach((iframe, key) =>
            this.iframeHandler(iframe as HTMLIFrameElement, key, courseNumber, topicNumber)
        );
    }

    private iframeHandler(
        iframe: HTMLIFrameElement,
        key: number,
        courseNumber: string,
        topicNumber: string
    ): void {
        if (!iframe.src.includes('external_tools')) {
            return;
        }

        const subscriptionId = `thread_init_subscription_speed_grader_${key}`;

        window.addEventListener(
            'message',
            (ev: MessageEvent) => {
                try {
                    const parsedData: IFrameResponse = JSON.parse(ev.data);
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
                    } else if (parsedData.type === 'event' && parsedData.data) {
                        this.log.info(`Event received for iframe ${key}:`, parsedData.data);
                        if (parsedData.data.eventName === 'thread_init') {
                            const msg: IFrameMessage = {
                                aud: 'annoto_widget',
                                id: `set_group_comment_query_${key}`,
                                action: 'set',
                                data: {
                                    value: 'group_comments_query',
                                    data: {
                                        ...parsedData.data.eventData as IThreadInitEvent,
                                        tag_value: `canvas_discussion_${courseNumber}_${topicNumber}`,
                                        user_id: this.studentId,
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

    private subscribeToThreadInit(
        iframe: HTMLIFrameElement,
        subscriptionId: string
    ): void {
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
