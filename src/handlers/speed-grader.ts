import { IFrameMessage, IFrameMessageWidgetSetCmd, IThreadInitEvent } from '@annoto/widget-api';
import { IDisposable, ILog } from '../interfaces';
import {
    annotoIframeHandle,
    formatTagValue,
    getCanvasResourceUUID,
    onIframeURLChange,
    isAnnotoRelatedIframe,
} from '../util';

export class SpeedGraderHandler {
    private holderObserver: MutationObserver | undefined;
    private activeStudentId: string | undefined;
    private activeIframeHolder: HTMLIFrameElement | undefined;
    private activeIframeContentLoadInterval: ReturnType<typeof setInterval> | undefined;
    private activeIframeDisposables: IDisposable[] = [];
    private managedIframes = new Set<string>();
    private managedIframesDisposables: IDisposable[] = [];

    constructor(private log: ILog) {
        /* empty */
    }

    init(): void {
        const iframeHolder = document.getElementById('iframe_holder') as HTMLIFrameElement;
        if (!iframeHolder) {
            this.log.log('AnnotoCanvas: Iframe holder not found');
            return;
        }

        this.holderObserver = new MutationObserver(() => this.handleIframeHolderMutations());
        this.holderObserver.observe(iframeHolder, {
            attributes: true,
            childList: true,
            subtree: false,
        });
        this.handleIframeHolderMutations();
    }

    private reset(): void {
        this.log.log(
            'AnnotoCanvas: reset SpeedGrader handler for student ID:',
            this.activeStudentId
        );
        this.activeStudentId = undefined;
        this.activeIframeHolder = undefined;
        if (this.activeIframeContentLoadInterval) {
            clearInterval(this.activeIframeContentLoadInterval);
        }
        this.activeIframeDisposables.forEach((d) => d.dispose());
        this.activeIframeDisposables = [];
        this.resetManagedIframes();
    }

    private resetManagedIframes(): void {
        this.managedIframesDisposables.forEach((d) => d.dispose());
        this.managedIframesDisposables = [];
        this.managedIframes.clear();
    }

    private handleIframeHolderMutations(): void {
        const iframe = document.getElementById('speedgrader_iframe') as HTMLIFrameElement;
        if (!iframe) {
            this.reset();
            return;
        }

        const dom = iframe.contentDocument;
        if (!dom) {
            this.reset();
            this.log.log('AnnotoCanvas: iframe holder dom content not ready');
            return;
        }

        this.log.info('AnnotoCanvas: SpeedGrader detected');
        this.activeIframeHolder = iframe;

        const studentId = this.getStudentId();
        if (!studentId) {
            return;
        }
        if (studentId === this.activeStudentId) {
            return;
        }

        this.reset();
        this.activeIframeHolder = iframe; // reset() clears this so reset
        this.activeStudentId = studentId;
        this.log.info('AnnotoCanvas: SpeedGrader handling student ID: ', studentId);

        this.activeIframeDisposables.push(
            onIframeURLChange(iframe, (href) => {
                this.log.log('AnnotoCanvas: SpeedGrader iframe URL changed', href);
                this.resetManagedIframes();
            })
        );

        this.activeIframeContentLoadInterval = setInterval(() => {
            const params = this.getTopicParams();
            if (!params) {
                return;
            }
            this.discussionTopicsHandle(params);
        }, 200);
    }

    private discussionTopicsHandle({
        courseNumber,
        topicNumber,
    }: {
        courseNumber: string;
        topicNumber: string;
    }): void {
        const iframes = this.activeIframeHolder?.contentDocument?.querySelectorAll('iframe');
        iframes?.forEach((iframe) => {
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
                    this.iframeHandler({ iframe, key, courseNumber, topicNumber });
                }
            });
        });
    }

    private iframeHandler({
        iframe,
        key,
        courseNumber,
        topicNumber,
    }: {
        iframe: HTMLIFrameElement;
        key: string;
        courseNumber: string;
        topicNumber: string;
    }): void {
        const subscriptionId = `speed_grader_thread_init_${key}`;
        this.log.info(
            `AnnotoCanvas: SpeedGrader handling tool ${key} for course ${courseNumber}, topic ${topicNumber}`
        );

        this.managedIframesDisposables.push(
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
                            sso_id: this.activeStudentId,
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
            })
        );
    }

    private getStudentId(): string | undefined {
        const currentLocation = window.location.href;
        const regex = /speed_grader.*student_id=(\d+)/;
        const match = currentLocation.match(regex) || [];
        const studentId = match[1];

        if (!studentId) {
            return undefined;
        }
        this.log.log(`AnnotoCanvas: student ID: ${studentId}`);
        return studentId;
    }

    private getTopicParams(): { courseNumber: string; topicNumber: string } | undefined {
        const iframe = this.activeIframeHolder;
        if (!iframe?.contentDocument) {
            return undefined;
        }
        const discussionLinkElement = iframe.contentDocument.getElementById(
            'discussion_view_link'
        ) as HTMLAnchorElement;
        const url = discussionLinkElement?.href || iframe.contentDocument.location.href;
        const regex = /courses\/(\d+)\/discussion_topics\/(\d+)/;
        const matches = url?.match(regex);
        if (!matches) {
            this.log.log('AnnotoCanvas: Discussion topic details not found');
            return undefined;
        }

        const courseNumber = matches[1];
        const topicNumber = matches[2];
        if (!courseNumber || !topicNumber) {
            return undefined;
        }
        return { courseNumber, topicNumber };
    }
}
