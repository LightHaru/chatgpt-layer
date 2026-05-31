type LogFn = (level: "info" | "warn" | "error", ...args: unknown[]) => void;
interface CodexWindowServices {
    getContext?: (hostId: string) => {
        registerWindow?: (windowLike: CodexWindowLike) => void;
    } | null;
    getContextForWebContents?: (webContents: Electron.WebContents) => {
        registerWindow?: (windowLike: CodexWindowLike) => void;
    } | null;
    windowManager?: {
        registerWindow?: (windowLike: CodexWindowLike, hostId: string, primary: boolean, appearance: string) => void;
        options?: {
            allowDevtools?: boolean;
            preloadPath?: string;
        };
    };
}
interface CodexWindowLike {
    id: number;
    webContents: Electron.WebContents;
    on(event: "closed", listener: () => void): unknown;
    once?(event: string, listener: (...args: unknown[]) => void): unknown;
    off?(event: string, listener: (...args: unknown[]) => void): unknown;
    removeListener?(event: string, listener: (...args: unknown[]) => void): unknown;
    isDestroyed?(): boolean;
    isFocused?(): boolean;
    focus?(): void;
    show?(): void;
    hide?(): void;
    getBounds?(): Electron.Rectangle;
    getContentBounds?(): Electron.Rectangle;
    getSize?(): [number, number];
    getContentSize?(): [number, number];
    setTitle?(title: string): void;
    getTitle?(): string;
    setRepresentedFilename?(filename: string): void;
    setDocumentEdited?(edited: boolean): void;
    setWindowButtonVisibility?(visible: boolean): void;
}
interface BrowserUiServerOptions {
    port: number;
    host: string;
    hideMainWindow: boolean;
    getWindowServices: () => CodexWindowServices | null;
    log: LogFn;
}
export declare function maybeStartBrowserUiServer(opts: Pick<BrowserUiServerOptions, "getWindowServices" | "log">): void;
export declare function startBrowserUiServer(opts: BrowserUiServerOptions): void;
export {};
