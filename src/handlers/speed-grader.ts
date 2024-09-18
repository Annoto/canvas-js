import { IFrameMessage, IFrameMessageWidgetSetCmd, IThreadInitEvent } from '@annoto/widget-api';
import { ILog } from '../interfaces';
import {
    annotoIframeHandle,
    formatTagValue,
    getCanvasResourceUUID,
    isAnnotoRelatedIframe,
} from '../util';

const USER_CONTENT_LOADED_INTERVAL = 200;
const MAX_ATTEMPTS = 900;

export class SpeedGraderHandler {
    private studentId: string = '';
    private observer: MutationObserver | undefined;
    private managedIframes = new Set<string>();

    constructor(private log: ILog) {
        /* empty */
    }

    init(): void {
        this.setStudentId();
        if (!this.studentId) {
            return;
        }
        this.log.info(`AnnotoCanvas: Student ID: ${this.studentId}`);

        const iframeHolder = document.getElementById('iframe_holder');
        if (!iframeHolder) {
            this.log.info('AnnotoCanvas: Iframe holder not found');
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
            this.log.info('AnnotoCanvas: Speedgrader iframe not found');
            return;
        }

        const dom = iframe.contentDocument;
        if (!dom) {
            this.log.info('AnnotoCanvas: Cannot access iframe content document');
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
                    this.log.info(
                        'AnnotoCanvas: Failed to load user content after maximum attempts'
                    );
                    clearInterval(userContentLoadInterval);
                }
            }
        }, USER_CONTENT_LOADED_INTERVAL);
    }

    private userContentLoadedHandler(speedgraderIframe: HTMLIFrameElement): void {
        const dom = speedgraderIframe.contentDocument;
        if (!dom) {
            this.log.info('AnnotoCanvas: Cannot access iframe content document');
            return;
        }
        const discussionLinkElement = dom.getElementById(
            'discussion_view_link'
        ) as HTMLAnchorElement;
        if (!discussionLinkElement) {
            this.log.info('AnnotoCanvas: Discussion link not found');
            return;
        }

        const discussionTopicLink = discussionLinkElement.href;
        const regex = /courses\/(\d+)\/discussion_topics\/(\d+)/;
        const matches = discussionTopicLink.match(regex);
        if (!matches) {
            this.log.info('AnnotoCanvas: Discussion topic details not found');
            return;
        }

        const courseNumber = matches[1];
        const topicNumber = matches[2];

        const iframes = dom.querySelectorAll('iframe');
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
                    this.iframeHandler(iframe, key, courseNumber, topicNumber);
                }
            });
        });
    }

    private iframeHandler(
        iframe: HTMLIFrameElement,
        key: string,
        courseNumber: string,
        topicNumber: string
    ): void {
        const subscriptionId = `speed_grader_thread_init_${key}`;

        annotoIframeHandle({
            iframe,
            key,
            log: this.log,
            subscriptionId,
            onSubscribe: () => {
                /* empty */
            },
            onThreadInit: (ev: IThreadInitEvent) => {
                const msgData: IFrameMessageWidgetSetCmd<'group_comments_query'> = {
                    action: 'group_comments_query',
                    widget_index: ev.widget_index,
                    data: {
                        sso_id: this.studentId,
                        threads_tag_value: formatTagValue({ courseNumber, topicNumber }),
                    },
                };
                const msg: IFrameMessage<'widget_set_cmd'> = {
                    aud: 'annoto_widget',
                    id: `set_group_comment_query_${key}`,
                    action: 'widget_set_cmd',
                    data: msgData,
                };
                iframe.contentWindow?.postMessage(JSON.stringify(msg), '*');
            },
            onEvent: () => {
                /* empty */
            },
        });
    }
}
