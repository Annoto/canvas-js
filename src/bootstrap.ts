const loadMain = (): void => {
    import(/* webpackChunkName: "annoto-main" */ './main').catch((err) => {
        console.error(err); // eslint-disable-line no-console
    });
};

loadMain();