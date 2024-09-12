export * from './discussion-topic';
export * from './speed-grader';

export function isAnnotoRelatedLti(doc: Document): boolean {
    // Direct LTI
    const wrapperDiv = doc.querySelector('.tool_content_wrapper');
    const formElement = wrapperDiv?.querySelector('form');
    if (formElement) {
        const actionRegExp = /annoto.*lti\/login/;

        if (actionRegExp.test(formElement.action)) {
            return true;
        }
    }
    // Kaltura LTI
    const inputElement: HTMLInputElement | null = doc.querySelector('#target_link_uri');
    if (inputElement) {
        const valueRegExp = /browseandembed/;

        if (valueRegExp.test(inputElement.value)) {
            return true;
        }
    }
    return false;
}
