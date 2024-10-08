export interface ILog extends Pick<Console, 'log' | 'info' | 'warn' | 'error'> {}

export interface IDisposable {
    dispose(): void;
}