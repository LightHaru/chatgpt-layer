import { BrowserWindow } from "electron";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolveNativeTweakPath } from "./native-paths";
import type {
  CodexRuntimeCapabilities,
  NativeHelperLaunchOptions,
  NativeHelperRef,
  NativeModuleKind,
  NativeModuleLoadOptions,
  NativeModuleRef,
  NativePanelCreateOptions,
  NativePanelRef,
  NativeViewAttachOptions,
  NativeViewRef,
} from "@codex-plusplus/sdk";

export interface NativeTweakContext {
  id: string;
  dir: string;
}

type NativeLog = (level: "info" | "warn" | "error", ...args: unknown[]) => void;

export interface NativeBridgeOptions {
  nativeHostPath?: string;
}

interface LoadedNativeModule {
  key: string;
  tweakId: string;
  id: string;
  kind: NativeModuleKind;
  path: string;
  exports: unknown;
}

interface NativeInstance {
  key: string;
  tweakId: string;
  id: string;
  kind: "panel" | "view";
  value: unknown;
  parentWindowId: number | null;
  windowId: number | null;
  disposeBindings: Array<() => void>;
  disposing: boolean;
}

interface HelperRequest {
  resolve(value: unknown): void;
  reject(error: Error): void;
  timer: NodeJS.Timeout;
}

interface NativeHelperProcess {
  key: string;
  tweakId: string;
  id: string;
  child: ChildProcessWithoutNullStreams;
  pending: Map<string, HelperRequest>;
}

export class NativeBridge {
  private modules = new Map<string, LoadedNativeModule>();
  private instances = new Map<string, NativeInstance>();
  private helpers = new Map<string, NativeHelperProcess>();
  private nativeHostExports: unknown | null = null;
  private nativeHostLoadError: Error | null = null;

  constructor(
    private readonly log: NativeLog,
    private readonly options: NativeBridgeOptions = {},
  ) {}

  getCapabilities(): CodexRuntimeCapabilities["native"] {
    const host = this.loadNativeHost(false);
    const hostCapabilities = host ? this.readNativeHostCapabilities(host) : {};
    const nativeHost = host !== null;
    return {
      inProcessModules: true,
      swiftModules: process.platform === "darwin",
      appKitEmbedding: Boolean(hostCapabilities.appKitEmbedding),
      childWindowOverlay: Boolean(hostCapabilities.childWindowOverlay),
      directViewAttach: Boolean(hostCapabilities.directViewAttach),
      metalViews: Boolean(hostCapabilities.metalViews),
      nativeHost,
      helpers: true,
    };
  }

  loadModule(ctx: NativeTweakContext, options: NativeModuleLoadOptions): NativeModuleRef {
    const id = assertBridgeId(options.id, "native module id");
    const fullPath = resolveTweakPath(ctx, options.path);
    const kind = options.kind ?? inferModuleKind(fullPath);

    if (kind !== "node-addon") {
      throw new Error(
        `${kind} native modules must be loaded through a .node Objective-C++ shim in Codex++ 1.0.0`,
      );
    }

    if (!fullPath.endsWith(".node")) {
      throw new Error("node-addon native modules must use a .node file");
    }

    const loaded = require(fullPath) as unknown;
    const exports = selectEntrypoint(loaded, options.entrypoint);
    const key = moduleKey(ctx.id, id);
    this.modules.set(key, { key, tweakId: ctx.id, id, kind, path: fullPath, exports });
    this.log("info", `loaded native module ${ctx.id}:${id}`, { kind, path: fullPath });
    return this.moduleRef(ctx.id, id, kind);
  }

  async createPanel(ctx: NativeTweakContext, options: NativePanelCreateOptions): Promise<NativePanelRef> {
    const created = await this.createNativeInstance(ctx, "panel", options.moduleId, options.factory ?? "createPanel", {
      parentWindowId: options.parentWindowId,
      bounds: options.bounds,
      transparent: options.transparent === true,
      passthroughMouse: options.passthroughMouse === true,
    });
    return this.panelRef(created);
  }

  async attachView(ctx: NativeTweakContext, options: NativeViewAttachOptions): Promise<NativeViewRef> {
    const created = await this.createNativeInstance(ctx, "view", options.moduleId, options.factory ?? "attachView", {
      parentWindowId: options.parentWindowId,
      bounds: options.bounds,
      zIndex: options.zIndex,
    });
    return this.viewRef(created);
  }

  launchHelper(ctx: NativeTweakContext, options: NativeHelperLaunchOptions): NativeHelperRef {
    const id = assertBridgeId(options.id, "native helper id");
    if ((options.transport ?? "stdio") !== "stdio") {
      throw new Error("native helpers support only stdio transport in Codex++ 1.0.0");
    }
    if ((options.restart ?? "never") !== "never") {
      throw new Error("native helper restart policies are not available in Codex++ 1.0.0");
    }
    const executable = resolveTweakPath(ctx, options.executable);
    const args = options.args ?? [];
    const env = { ...process.env, ...(options.env ?? {}) };
    const child = spawn(executable, args, {
      cwd: ctx.dir,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const key = helperKey(ctx.id, id);
    const helper: NativeHelperProcess = {
      key,
      tweakId: ctx.id,
      id,
      child,
      pending: new Map(),
    };
    this.helpers.set(key, helper);

    const stdout = createInterface({ input: child.stdout });
    stdout.on("line", (line) => this.handleHelperLine(helper, line));
    child.stderr.on("data", (chunk) => {
      this.log("warn", `native helper ${ctx.id}:${id} stderr`, String(chunk));
    });
    child.on("exit", (code, signal) => {
      this.log("info", `native helper ${ctx.id}:${id} exited`, { code, signal });
      this.helpers.delete(key);
      for (const request of helper.pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error(`native helper exited before response`));
      }
      helper.pending.clear();
    });
    child.on("error", (error) => {
      this.log("error", `native helper ${ctx.id}:${id} failed`, error);
      this.helpers.delete(key);
      for (const request of helper.pending.values()) {
        clearTimeout(request.timer);
        request.reject(error);
      }
      helper.pending.clear();
    });

    this.log("info", `launched native helper ${ctx.id}:${id}`, { pid: child.pid, executable });
    return this.helperRef(ctx.id, id, child.pid ?? -1);
  }

  disposeTweak(tweakId: string): void {
    for (const [key, instance] of [...this.instances]) {
      if (instance.tweakId !== tweakId) continue;
      void this.disposeInstance(instance).finally(() => this.instances.delete(key));
    }
    for (const [key, helper] of [...this.helpers]) {
      if (helper.tweakId !== tweakId) continue;
      this.stopHelper(helper);
      this.helpers.delete(key);
    }
    for (const [key, mod] of [...this.modules]) {
      if (mod.tweakId !== tweakId) continue;
      void callOptional(mod.exports, "dispose", []);
      this.modules.delete(key);
    }
  }

  disposeAll(): void {
    const tweakIds = new Set([
      ...[...this.modules.values()].map((item) => item.tweakId),
      ...[...this.instances.values()].map((item) => item.tweakId),
      ...[...this.helpers.values()].map((item) => item.tweakId),
    ]);
    for (const id of tweakIds) this.disposeTweak(id);
  }

  async callInstance(
    tweakId: string,
    kind: "panel" | "view",
    id: string,
    method: string,
    arg?: unknown,
  ): Promise<void> {
    if (kind === "panel") {
      if (method === "setBounds") return this.invokeInstance(tweakId, id, "setBounds", [arg]);
      if (method === "show") return this.invokeInstance(tweakId, id, "show", []);
      if (method === "hide") return this.invokeInstance(tweakId, id, "hide", []);
      if (method === "dispose") return this.disposeInstanceById(tweakId, id);
    }
    if (kind === "view") {
      if (method === "setBounds") return this.invokeInstance(tweakId, id, "setBounds", [arg]);
      if (method === "setVisible") return this.invokeInstance(tweakId, id, "setVisible", [arg]);
      if (method === "dispose") return this.disposeInstanceById(tweakId, id);
    }
    throw new Error(`unknown native ${kind} method: ${method}`);
  }

  async callHelper(
    tweakId: string,
    helperId: string,
    method: string,
    payload?: unknown,
    timeoutMs?: number,
  ): Promise<unknown> {
    if (method === "send") return this.sendHelper(tweakId, helperId, payload);
    if (method === "request") return this.requestHelper(tweakId, helperId, payload, timeoutMs);
    if (method === "stop") return this.stopHelperById(tweakId, helperId);
    throw new Error(`unknown native helper method: ${method}`);
  }

  private moduleRef(tweakId: string, id: string, kind = this.moduleFor(tweakId, id).kind): NativeModuleRef {
    return {
      id,
      kind,
      request: (method, payload, timeoutMs) =>
        this.requestModule(tweakId, id, method, payload, timeoutMs),
      dispose: () => this.disposeModule(tweakId, id),
    };
  }

  private panelRef(instance: NativeInstance): NativePanelRef {
    return {
      id: instance.id,
      windowId: instance.windowId,
      setBounds: (bounds) => this.invokeInstance(instance.tweakId, instance.id, "setBounds", [bounds]),
      show: () => this.invokeInstance(instance.tweakId, instance.id, "show", []),
      hide: () => this.invokeInstance(instance.tweakId, instance.id, "hide", []),
      dispose: () => this.disposeInstanceById(instance.tweakId, instance.id),
    };
  }

  private viewRef(instance: NativeInstance): NativeViewRef {
    return {
      id: instance.id,
      setBounds: (bounds) => this.invokeInstance(instance.tweakId, instance.id, "setBounds", [bounds]),
      setVisible: (visible) => this.invokeInstance(instance.tweakId, instance.id, "setVisible", [visible]),
      dispose: () => this.disposeInstanceById(instance.tweakId, instance.id),
    };
  }

  private helperRef(tweakId: string, id: string, pid: number): NativeHelperRef {
    return {
      id,
      pid,
      send: (message) => this.sendHelper(tweakId, id, message),
      request: (message, timeoutMs) => this.requestHelper(tweakId, id, message, timeoutMs),
      stop: () => this.stopHelperById(tweakId, id),
    };
  }

  async requestModule(
    tweakId: string,
    id: string,
    method: string,
    payload?: unknown,
    _timeoutMs?: number,
  ): Promise<unknown> {
    const mod = this.moduleFor(tweakId, id);
    const target = asRecord(mod.exports);
    const fn = target?.request;
    if (typeof fn === "function") {
      return await fn.call(mod.exports, method, payload);
    }
    const methodFn = target?.[method];
    if (typeof methodFn === "function") {
      return await methodFn.call(mod.exports, payload);
    }
    throw new Error(`native module ${tweakId}:${id} has no request() or ${method}()`);
  }

  async disposeModule(tweakId: string, id: string): Promise<void> {
    const key = moduleKey(tweakId, id);
    const mod = this.modules.get(key);
    if (!mod) return;
    await callOptional(mod.exports, "dispose", []);
    this.modules.delete(key);
  }

  private async createNativeInstance(
    ctx: NativeTweakContext,
    kind: "panel" | "view",
    moduleId: string | undefined,
    factory: string,
    options: Record<string, unknown>,
  ): Promise<NativeInstance> {
    const target = moduleId ? this.moduleFor(ctx.id, moduleId).exports : this.loadNativeHost(true);
    const fn = asRecord(target)?.[factory];
    if (typeof fn !== "function") {
      const label = moduleId ? `native module ${ctx.id}:${moduleId}` : "Codex++ native host";
      throw new Error(`${label} has no factory ${factory}()`);
    }

    const parentWindow = typeof options.parentWindowId === "number"
      ? BrowserWindow.fromId(options.parentWindowId)
      : BrowserWindow.getFocusedWindow();
    const parentNativeHandle = nativeHandleForWindow(parentWindow);
    const value = await fn.call(target, {
      ...options,
      parentWindowId: windowIdFor(parentWindow),
      parentWebContentsId: webContentsIdFor(parentWindow),
      parentNativeHandle,
    });
    const id = typeof asRecord(value)?.id === "string" ? String(asRecord(value)?.id) : randomUUID();
    const windowId = typeof asRecord(value)?.windowId === "number" ? Number(asRecord(value)?.windowId) : null;
    const instance: NativeInstance = {
      key: instanceKey(ctx.id, id),
      tweakId: ctx.id,
      id,
      kind,
      value,
      parentWindowId: windowIdFor(parentWindow),
      windowId,
      disposeBindings: [],
      disposing: false,
    };
    this.instances.set(instance.key, instance);
    if (canBindParentWindow(parentWindow)) {
      this.bindInstanceToParent(instance, parentWindow);
      this.syncParentState(instance, parentWindow, "created");
    }
    this.log("info", `created native ${kind} ${ctx.id}:${id}`, {
      moduleId: moduleId ?? "codexpp.native-host",
      factory,
      windowId,
    });
    return instance;
  }

  private loadNativeHost(required: true): unknown;
  private loadNativeHost(required: false): unknown | null;
  private loadNativeHost(required: boolean): unknown | null {
    if (this.nativeHostExports) return this.nativeHostExports;
    if (this.nativeHostLoadError && !required) return null;
    const nativeHostPath = this.options.nativeHostPath;
    if (!nativeHostPath || !existsSync(nativeHostPath)) {
      const error = new Error("Codex++ native host is not installed");
      this.nativeHostLoadError = error;
      if (required) throw error;
      return null;
    }
    try {
      this.nativeHostExports = require(nativeHostPath) as unknown;
      this.nativeHostLoadError = null;
      this.log("info", "loaded Codex++ native host", { path: nativeHostPath });
      return this.nativeHostExports;
    } catch (error) {
      this.nativeHostLoadError = error instanceof Error ? error : new Error(String(error));
      this.log("error", "failed to load Codex++ native host", this.nativeHostLoadError);
      if (required) throw this.nativeHostLoadError;
      return null;
    }
  }

  private readNativeHostCapabilities(host: unknown): Record<string, unknown> {
    const getCapabilities = asRecord(host)?.getCapabilities;
    if (typeof getCapabilities !== "function") return {};
    try {
      const capabilities = getCapabilities.call(host);
      return asRecord(capabilities) ?? {};
    } catch (error) {
      this.log("warn", "Codex++ native host capability probe failed", error);
      return {};
    }
  }

  private async invokeInstance(
    tweakId: string,
    id: string,
    method: string,
    args: unknown[],
  ): Promise<void> {
    const instance = this.instanceFor(tweakId, id);
    const fn = asRecord(instance.value)?.[method];
    if (typeof fn === "function") {
      await fn.apply(instance.value, args);
      return;
    }
    if (instance.windowId !== null) {
      const win = BrowserWindow.fromId(instance.windowId);
      if (win && !win.isDestroyed()) {
        if (method === "setBounds") win.setBounds(args[0] as Electron.Rectangle);
        else if (method === "show") win.show();
        else if (method === "hide") win.hide();
        else if (method === "setVisible") (args[0] ? win.show() : win.hide());
        return;
      }
    }
    throw new Error(`native ${instance.kind} ${tweakId}:${id} does not implement ${method}()`);
  }

  private async disposeInstanceById(tweakId: string, id: string): Promise<void> {
    const key = instanceKey(tweakId, id);
    const instance = this.instances.get(key);
    if (!instance) return;
    await this.disposeInstance(instance);
    this.instances.delete(key);
  }

  private async disposeInstance(instance: NativeInstance): Promise<void> {
    if (instance.disposing) return;
    instance.disposing = true;
    for (const dispose of instance.disposeBindings.splice(0)) {
      try {
        dispose();
      } catch {}
    }
    await callOptional(instance.value, "dispose", []);
    if (instance.windowId !== null) {
      const win = BrowserWindow.fromId(instance.windowId);
      if (win && !win.isDestroyed()) win.close();
    }
  }

  private bindInstanceToParent(instance: NativeInstance, parentWindow: Electron.BrowserWindow): void {
    const on = (event: string, listener: (...args: unknown[]) => void) => {
      parentWindow.on(event as never, listener as never);
      instance.disposeBindings.push(() => parentWindow.off(event as never, listener as never));
    };
    const syncBounds = () => this.syncParentState(instance, parentWindow, "bounds");
    const syncFocus = (focused: boolean) => this.signalParentState(instance, parentWindow, "focus", { focused });
    const syncVisibility = (visible: boolean) =>
      this.signalParentState(instance, parentWindow, "visibility", { visible });
    const disposeWithParent = () => {
      this.log("info", `disposing native ${instance.kind} ${instance.tweakId}:${instance.id}; parent closed`);
      void this.disposeInstanceById(instance.tweakId, instance.id);
    };

    on("move", syncBounds);
    on("resize", syncBounds);
    on("enter-full-screen", syncBounds);
    on("leave-full-screen", syncBounds);
    on("maximize", syncBounds);
    on("unmaximize", syncBounds);
    on("minimize", syncBounds);
    on("restore", syncBounds);
    on("show", () => syncVisibility(true));
    on("hide", () => syncVisibility(false));
    on("focus", () => syncFocus(true));
    on("blur", () => syncFocus(false));
    on("close", disposeWithParent);
    on("closed", disposeWithParent);
  }

  private syncParentState(
    instance: NativeInstance,
    parentWindow: Electron.BrowserWindow,
    reason: string,
  ): void {
    const state = parentWindowState(parentWindow, reason);
    if (!state) return;
    void this.callFirstOptionalInstance(instance, ["syncParent", "parentChanged"], [state])
      .then((handled) => {
        if (!handled) {
          return this.callFirstOptionalInstance(
            instance,
            ["setParentBounds", "parentBoundsChanged"],
            [state.bounds, state],
          );
        }
        return false;
      })
      .catch((error) => this.log("warn", `native ${instance.kind} parent sync failed`, error));
  }

  private signalParentState(
    instance: NativeInstance,
    parentWindow: Electron.BrowserWindow,
    reason: string,
    patch: Record<string, unknown>,
  ): void {
    const state = parentWindowState(parentWindow, reason);
    if (!state) return;
    const payload = { ...state, ...patch };
    void this.callFirstOptionalInstance(instance, ["parentStateChanged", "parentChanged"], [payload])
      .catch((error) => this.log("warn", `native ${instance.kind} parent signal failed`, error));
  }

  private async callFirstOptionalInstance(
    instance: NativeInstance,
    methods: string[],
    args: unknown[],
  ): Promise<boolean> {
    const target = asRecord(instance.value);
    for (const method of methods) {
      const fn = target?.[method];
      if (typeof fn !== "function") continue;
      await fn.apply(instance.value, args);
      return true;
    }
    return false;
  }

  private async sendHelper(tweakId: string, id: string, message: unknown): Promise<void> {
    const helper = this.helperFor(tweakId, id);
    helper.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private async requestHelper(
    tweakId: string,
    id: string,
    message: unknown,
    timeoutMs = 10_000,
  ): Promise<unknown> {
    const helper = this.helperFor(tweakId, id);
    const requestId = randomUUID();
    const payload = { id: requestId, message };
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        helper.pending.delete(requestId);
        reject(new Error(`native helper request timed out: ${tweakId}:${id}`));
      }, timeoutMs);
      helper.pending.set(requestId, { resolve, reject, timer });
      helper.child.stdin.write(`${JSON.stringify(payload)}\n`);
    });
  }

  private async stopHelperById(tweakId: string, id: string): Promise<void> {
    const key = helperKey(tweakId, id);
    const helper = this.helpers.get(key);
    if (!helper) return;
    this.stopHelper(helper);
    this.helpers.delete(key);
  }

  private stopHelper(helper: NativeHelperProcess): void {
    if (helper.child.killed) return;
    helper.child.kill();
    const timer = setTimeout(() => {
      if (!helper.child.killed) helper.child.kill("SIGKILL");
    }, 1500);
    timer.unref?.();
  }

  private handleHelperLine(helper: NativeHelperProcess, line: string): void {
    let payload: { id?: unknown; result?: unknown; error?: unknown };
    try {
      payload = JSON.parse(line) as typeof payload;
    } catch {
      this.log("info", `native helper ${helper.tweakId}:${helper.id}`, line);
      return;
    }
    if (typeof payload.id !== "string") return;
    const request = helper.pending.get(payload.id);
    if (!request) return;
    helper.pending.delete(payload.id);
    clearTimeout(request.timer);
    if (payload.error) {
      request.reject(new Error(String(payload.error)));
    } else {
      request.resolve(payload.result);
    }
  }

  private moduleFor(tweakId: string, id: string): LoadedNativeModule {
    const mod = this.modules.get(moduleKey(tweakId, id));
    if (!mod) throw new Error(`native module is not loaded: ${tweakId}:${id}`);
    return mod;
  }

  private instanceFor(tweakId: string, id: string): NativeInstance {
    const instance = this.instances.get(instanceKey(tweakId, id));
    if (!instance) throw new Error(`native instance is not loaded: ${tweakId}:${id}`);
    return instance;
  }

  private helperFor(tweakId: string, id: string): NativeHelperProcess {
    const helper = this.helpers.get(helperKey(tweakId, id));
    if (!helper) throw new Error(`native helper is not running: ${tweakId}:${id}`);
    return helper;
  }
}

function resolveTweakPath(ctx: NativeTweakContext, path: string): string {
  return resolveNativeTweakPath(ctx.dir, path);
}

function inferModuleKind(path: string): NativeModuleKind {
  if (path.endsWith(".node")) return "node-addon";
  if (path.endsWith(".dylib")) return "dylib";
  if (path.endsWith(".framework")) return "framework";
  throw new Error("native module path must end in .node, .dylib, or .framework");
}

function selectEntrypoint(loaded: unknown, entrypoint: string | undefined): unknown {
  if (!entrypoint) return asRecord(loaded)?.default ?? loaded;
  const selected = asRecord(loaded)?.[entrypoint];
  if (selected === undefined) throw new Error(`native module entrypoint not found: ${entrypoint}`);
  return selected;
}

function assertBridgeId(value: string, label: string): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9._-]+$/.test(value)) {
    throw new Error(`${label} may only contain letters, numbers, dots, underscores, and dashes`);
  }
  return value;
}

function moduleKey(tweakId: string, moduleId: string): string {
  return `${tweakId}:${moduleId}`;
}

function instanceKey(tweakId: string, id: string): string {
  return `${tweakId}:${id}`;
}

function helperKey(tweakId: string, id: string): string {
  return `${tweakId}:${id}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

async function callOptional(target: unknown, method: string, args: unknown[]): Promise<void> {
  const fn = asRecord(target)?.[method];
  if (typeof fn === "function") await fn.apply(target, args);
}

function parentWindowState(parentWindow: Electron.BrowserWindow, reason: string): Record<string, unknown> | null {
  if (isWindowDestroyed(parentWindow)) return null;
  const bounds = callWindowMethod<Electron.Rectangle>(parentWindow, "getBounds");
  const contentBounds = callWindowMethod<Electron.Rectangle>(parentWindow, "getContentBounds");
  return {
    reason,
    windowId: windowIdFor(parentWindow),
    webContentsId: webContentsIdFor(parentWindow),
    bounds,
    contentBounds,
    visible: callWindowMethod<boolean>(parentWindow, "isVisible") ?? null,
    focused: callWindowMethod<boolean>(parentWindow, "isFocused") ?? null,
    minimized: callWindowMethod<boolean>(parentWindow, "isMinimized") ?? null,
    maximized: callWindowMethod<boolean>(parentWindow, "isMaximized") ?? null,
    fullscreen: callWindowMethod<boolean>(parentWindow, "isFullScreen") ?? null,
  };
}

function nativeHandleForWindow(parentWindow: Electron.BrowserWindow | null | undefined): Buffer | null {
  if (!parentWindow || isWindowDestroyed(parentWindow)) return null;
  const fn = asRecord(parentWindow)?.getNativeWindowHandle;
  if (typeof fn !== "function") return null;
  try {
    const handle = fn.call(parentWindow);
    return Buffer.isBuffer(handle) ? handle : null;
  } catch {
    return null;
  }
}

function canBindParentWindow(
  parentWindow: Electron.BrowserWindow | null | undefined,
): parentWindow is Electron.BrowserWindow {
  if (!parentWindow || isWindowDestroyed(parentWindow)) return false;
  return typeof asRecord(parentWindow)?.on === "function" &&
    typeof asRecord(parentWindow)?.off === "function";
}

function isWindowDestroyed(parentWindow: Electron.BrowserWindow | null | undefined): boolean {
  const fn = asRecord(parentWindow)?.isDestroyed;
  if (typeof fn !== "function") return false;
  try {
    return Boolean(fn.call(parentWindow));
  } catch {
    return true;
  }
}

function windowIdFor(parentWindow: Electron.BrowserWindow | null | undefined): number | null {
  const id = asRecord(parentWindow)?.id;
  return typeof id === "number" ? id : null;
}

function webContentsIdFor(parentWindow: Electron.BrowserWindow | null | undefined): number | null {
  const webContents = asRecord(asRecord(parentWindow)?.webContents);
  const id = webContents?.id;
  return typeof id === "number" ? id : null;
}

function callWindowMethod<T>(parentWindow: Electron.BrowserWindow, method: string): T | null {
  const fn = asRecord(parentWindow)?.[method];
  if (typeof fn !== "function") return null;
  try {
    return fn.call(parentWindow) as T;
  } catch {
    return null;
  }
}
