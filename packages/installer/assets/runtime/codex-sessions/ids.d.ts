export declare const SESSION_ID_RE: RegExp;
export declare function generateSessionId(): string;
export declare function isSessionId(value: unknown): value is string;
export declare function assertSessionId(value: unknown): asserts value is string;
