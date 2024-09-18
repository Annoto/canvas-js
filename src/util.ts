// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = (func: (...args: any[]) => void, wait = 0): ((...args: any[]) => void) => {
    let timer: ReturnType<typeof setTimeout>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (...args: any[]): void => {
        clearTimeout(timer);
        timer = setTimeout(func, wait, ...args);
    };
};

export const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

export const isAnnotoRelatedLti = (doc: Document): boolean => {
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
};
