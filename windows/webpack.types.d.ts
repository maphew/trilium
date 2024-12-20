declare module 'webpack' {
    interface Resolver {
        hooks: {
            resolved: {
                tap(name: string, callback: (result: { request: string; path: string }) => void): void;
            };
        };
    }
}
