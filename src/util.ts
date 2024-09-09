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
