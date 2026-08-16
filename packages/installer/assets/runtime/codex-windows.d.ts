import type { CodexWindowRef } from "@codex-plusplus/sdk";
export interface CodexWindowServices {
    createFreshWindow?: (route?: string) => Promise<Electron.BrowserWindow | null>;
    createFreshLocalWindow?: (route?: string) => Promise<Electron.BrowserWindow | null>;
    ensureHostWindow?: (hostId?: string) => Promise<Electron.BrowserWindow | null>;
    getPrimaryWindow?: (hostId?: string) => Electron.BrowserWindow | null;
    getContext?: (hostId: string) => {
        registerWindow?: (windowLike: CodexWindowLike) => void;
    } | null;
    windowManager?: {
        createWindow?: (opts: Record<string, unknown>) => Promise<Electron.BrowserWindow | null>;
        getPrimaryWindow?: () => Electron.BrowserWindow | null;
        registerWindow?: (windowLike: CodexWindowLike, hostId: string, primary: boolean, appearance: string) => void;
        options?: {
            allowDevtools?: boolean;
            preloadPath?: string;
        };
    };
}
export interface CodexWindowLike {
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
export interface CodexCreateWindowOptions {
    route: string;
    hostId?: string;
    show?: boolean;
    appearance?: string;
    parentWindowId?: number;
    bounds?: Electron.Rectangle;
}
export interface CodexCreateViewOptions {
    route: string;
    hostId?: string;
    appearance?: string;
}
export declare function getPrimaryCodexWindow(): Electron.BrowserWindow | null;
export declare function getPrimaryCodexWindowRef(): CodexWindowRef | null;
export declare function focusCodexWindow(windowId: number): boolean;
export declare function showCodexWindow(windowId: number): boolean;
export declare function createCodexBrowserView(opts: CodexCreateViewOptions): Promise<unknown>;
export declare function createCodexWindow(opts: CodexCreateWindowOptions): Promise<CodexWindowRef>;
export declare function makeWindowLikeForView(view: Electron.BrowserView): CodexWindowLike;
export declare function codexAppUrl(route: string, hostId: string): string;
export declare function normalizeOwlViewUrl(url: string): string;
export declare function getCodexWindowServices(): CodexWindowServices | null;
export declare function normalizeCodexRoute(route: string): string;
export declare function asRecord(value: unknown): Record<string, unknown> | null;
export declare function callObjectMethod(target: unknown, method: string, args: unknown[]): unknown;
export declare function isWindowDestroyed(win: Electron.BrowserWindow | null | undefined): boolean;
export declare function windowIdFor(win: Electron.BrowserWindow | null | undefined): number | null;
