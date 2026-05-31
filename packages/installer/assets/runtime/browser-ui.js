"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeStartBrowserUiServer = maybeStartBrowserUiServer;
exports.startBrowserUiServer = startBrowserUiServer;
const electron_1 = require("electron");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_http_1 = require("node:http");
const node_path_1 = require("node:path");
const CONNECT_PORT_CHANNEL = "codexpp:browser-ui-connect-app-host";
const BRIDGE_REQUEST_CHANNEL = "codexpp:browser-ui-bridge-request";
const BRIDGE_RESPONSE_CHANNEL = "codexpp:browser-ui-bridge-response";
const MESSAGE_FOR_VIEW_CHANNEL = "codexpp:browser-ui-message-for-view";
const WORKER_MESSAGE_CHANNEL = "codexpp:browser-ui-worker-message";
const SYSTEM_THEME_CHANNEL = "codexpp:browser-ui-system-theme";
const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
};
let activeServer = null;
let activeHost = null;
let activeOptions = null;
const bridgeRequests = new Map();
const controlClients = new Set();
function maybeStartBrowserUiServer(opts) {
    if (process.env.CODEXPP_BROWSER_UI !== "1")
        return;
    const port = parsePort(process.env.CODEXPP_BROWSER_UI_PORT, 8765);
    startBrowserUiServer({
        ...opts,
        port,
        host: "127.0.0.1",
        hideMainWindow: process.env.CODEXPP_BROWSER_UI_HIDE_MAIN === "1",
    });
}
function startBrowserUiServer(opts) {
    if (activeServer)
        return;
    activeOptions = opts;
    installBrowserUiIpcHandlers(opts.log);
    const server = (0, node_http_1.createServer)((req, res) => {
        handleHttpRequest(req, res).catch((error) => {
            opts.log("error", "browser UI request failed", { message: error.message });
            sendText(res, 500, "Internal Server Error\n", "text/plain; charset=utf-8");
        });
    });
    server.on("upgrade", (req, socket, head) => {
        handleUpgrade(req, socket, head).catch((error) => {
            opts.log("warn", "browser UI websocket upgrade failed", { message: error.message });
            socket.destroy();
        });
    });
    server.on("error", (error) => {
        opts.log("error", "browser UI server failed", { message: error.message });
    });
    server.listen(opts.port, opts.host, () => {
        opts.log("info", `browser UI server listening at http://${opts.host}:${opts.port}/`);
    });
    activeServer = server;
    if (opts.hideMainWindow) {
        for (const delayMs of [500, 1_500, 3_000]) {
            const timer = setTimeout(hideVisibleCodexWindows, delayMs);
            timer.unref?.();
        }
    }
}
function installBrowserUiIpcHandlers(log) {
    electron_1.ipcMain.removeAllListeners(BRIDGE_RESPONSE_CHANNEL);
    electron_1.ipcMain.removeAllListeners(MESSAGE_FOR_VIEW_CHANNEL);
    electron_1.ipcMain.removeAllListeners(WORKER_MESSAGE_CHANNEL);
    electron_1.ipcMain.removeAllListeners(SYSTEM_THEME_CHANNEL);
    electron_1.ipcMain.on(BRIDGE_RESPONSE_CHANNEL, (event, payload) => {
        if (!isBrowserUiHostSender(event.sender))
            return;
        const response = asRecord(payload);
        const id = typeof response?.id === "string" ? response.id : "";
        const pending = bridgeRequests.get(id);
        if (!pending)
            return;
        bridgeRequests.delete(id);
        clearTimeout(pending.timer);
        if (response?.ok === true) {
            pending.resolve(response.value);
        }
        else {
            pending.reject(new Error(typeof response?.error === "string" ? response.error : "Bridge request failed"));
        }
    });
    electron_1.ipcMain.on(MESSAGE_FOR_VIEW_CHANNEL, (event, message) => {
        if (!isBrowserUiHostSender(event.sender))
            return;
        broadcastControl({ type: "message-for-view", message });
    });
    electron_1.ipcMain.on(WORKER_MESSAGE_CHANNEL, (event, workerId, message) => {
        if (!isBrowserUiHostSender(event.sender))
            return;
        if (typeof workerId !== "string")
            return;
        broadcastControl({ type: "worker-message", workerId, message });
    });
    electron_1.ipcMain.on(SYSTEM_THEME_CHANNEL, (event, value) => {
        if (!isBrowserUiHostSender(event.sender))
            return;
        broadcastControl({ type: "system-theme-variant-updated", value });
    });
    process.once("exit", () => {
        for (const pending of bridgeRequests.values()) {
            clearTimeout(pending.timer);
            pending.reject(new Error("Codex++ browser UI server stopped"));
        }
        bridgeRequests.clear();
        for (const client of controlClients)
            client.close();
        controlClients.clear();
        try {
            if (activeHost && !activeHost.webContents.isDestroyed()) {
                activeHost.webContents.close({ waitForBeforeUnload: false });
            }
        }
        catch (error) {
            log("warn", "browser UI host cleanup failed", { message: String(error) });
        }
    });
}
async function handleHttpRequest(req, res) {
    const options = requireOptions();
    const url = requestUrl(req);
    if (!url) {
        sendText(res, 400, "Bad Request\n", "text/plain; charset=utf-8");
        return;
    }
    if (url.pathname === "/codexpp/browser-ui/health") {
        sendJson(res, 200, { ok: true });
        return;
    }
    if (url.pathname === "/codexpp/browser-ui/bridge") {
        if (req.method !== "POST") {
            sendText(res, 405, "Method Not Allowed\n", "text/plain; charset=utf-8");
            return;
        }
        const body = asRecord(await readJsonBody(req));
        const method = typeof body?.method === "string" ? body.method : "";
        const args = Array.isArray(body?.args) ? body.args : [];
        try {
            const value = await callHiddenBridge(method, args);
            sendJson(res, 200, { ok: true, value });
        }
        catch (error) {
            sendJson(res, 500, {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return;
    }
    if (url.pathname === "/codexpp/browser-ui/bridge.js") {
        if (req.method !== "GET" && req.method !== "HEAD") {
            sendText(res, 405, "Method Not Allowed\n", "text/plain; charset=utf-8");
            return;
        }
        const script = browserBridgeScript(await collectInitialState(options));
        sendBuffer(res, 200, Buffer.from(script), MIME_TYPES[".js"], req.method === "HEAD");
        return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
        sendText(res, 405, "Method Not Allowed\n", "text/plain; charset=utf-8");
        return;
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
        const html = await browserIndexHtml(options);
        sendBuffer(res, 200, Buffer.from(html), MIME_TYPES[".html"], req.method === "HEAD");
        return;
    }
    const file = webviewFile(url.pathname);
    if (!file) {
        sendText(res, 404, "Not Found\n", "text/plain; charset=utf-8");
        return;
    }
    const content = (0, node_fs_1.readFileSync)(file);
    sendBuffer(res, 200, content, mimeType(file), req.method === "HEAD");
}
async function handleUpgrade(req, socket, head) {
    const url = requestUrl(req);
    if (!url)
        throw new Error("bad websocket URL");
    if (url.pathname !== "/codexpp/browser-ui/rpc" && url.pathname !== "/codexpp/browser-ui/control") {
        socket.destroy();
        return;
    }
    const ws = acceptWebSocket(req, socket, head);
    if (url.pathname === "/codexpp/browser-ui/control") {
        controlClients.add(ws);
        ws.onClose(() => controlClients.delete(ws));
        ws.sendJson({ type: "hello" });
        return;
    }
    const host = await ensureBrowserUiHost();
    const { port1, port2 } = new electron_1.MessageChannelMain();
    host.webContents.postMessage(CONNECT_PORT_CHANNEL, {}, [port2]);
    bridgeMessagePortToWebSocket(port1, ws);
}
async function browserIndexHtml(options) {
    const indexPath = (0, node_path_1.join)(webviewRoot(), "index.html");
    let html = relaxBrowserUiCsp((0, node_fs_1.readFileSync)(indexPath, "utf8"));
    const shim = `<script src="/codexpp/browser-ui/bridge.js"></script>`;
    if (html.includes("</head>")) {
        html = html.replace("</head>", `${shim}\n  </head>`);
    }
    else {
        html = `${shim}\n${html}`;
    }
    return html;
}
function relaxBrowserUiCsp(html) {
    return html.replace(/(<meta\s+http-equiv=["']Content-Security-Policy["']\s+content=")([^"]*)(")/, (_match, prefix, content, suffix) => {
        const directives = parseCspDirectives(decodeHtmlAttribute(content));
        directives.set("child-src", "'self' blob: data: http: https:");
        directives.set("frame-src", "'self' blob: data: http: https:");
        directives.set("connect-src", "'self' http: https: ws: wss: sentry-ipc:");
        return `${prefix}${encodeHtmlAttribute(formatCspDirectives(directives))}${suffix}`;
    });
}
function parseCspDirectives(content) {
    const directives = new Map();
    for (const part of content.split(";")) {
        const trimmed = part.trim();
        if (!trimmed)
            continue;
        const [name, ...rest] = trimmed.split(/\s+/);
        if (!name)
            continue;
        directives.set(name, rest.join(" "));
    }
    return directives;
}
function formatCspDirectives(directives) {
    return [...directives.entries()]
        .map(([name, value]) => (value ? `${name} ${value}` : name))
        .join("; ");
}
function decodeHtmlAttribute(value) {
    return value
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}
function encodeHtmlAttribute(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;");
}
async function collectInitialState(options) {
    await ensureBrowserUiHost();
    const [snapshot, systemThemeVariant, sentryInitOptions, buildFlavor, usesOwlAppShell] = await Promise.all([
        callHiddenBridge("snapshot", []),
        callHiddenBridge("systemTheme", []),
        callHiddenBridge("sentryOptions", []),
        callHiddenBridge("buildFlavor", []),
        callHiddenBridge("usesOwlAppShell", []),
    ]);
    if (options.hideMainWindow)
        hideVisibleCodexWindows();
    return {
        snapshot: asPlainObject(snapshot),
        systemThemeVariant: typeof systemThemeVariant === "string" ? systemThemeVariant : currentSystemThemeVariant(),
        sentryInitOptions,
        buildFlavor,
        usesOwlAppShell: usesOwlAppShell === true,
        platform: process.platform,
        arch: process.arch,
    };
}
async function ensureBrowserUiHost() {
    if (activeHost && !activeHost.webContents.isDestroyed())
        return activeHost;
    const options = requireOptions();
    const services = await waitForWindowServices(options);
    const windowManager = services.windowManager;
    if (!windowManager?.registerWindow) {
        throw new Error("Codex window registration services are unavailable");
    }
    const view = new electron_1.BrowserView({
        webPreferences: {
            preload: windowManager.options?.preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            spellcheck: false,
            devTools: windowManager.options?.allowDevtools,
        },
    });
    const windowLike = makeWindowLikeForView(view);
    windowManager.registerWindow(windowLike, "local", false, "secondary");
    const context = services.getContextForWebContents?.(view.webContents) ?? services.getContext?.("local");
    context?.registerWindow?.(windowLike);
    await view.webContents.loadURL("about:blank");
    activeHost = { view, webContents: view.webContents };
    view.webContents.once("destroyed", () => {
        if (activeHost?.webContents === view.webContents)
            activeHost = null;
    });
    options.log("info", "browser UI hidden host ready", { webContentsId: view.webContents.id });
    return activeHost;
}
async function waitForWindowServices(options) {
    const started = Date.now();
    while (Date.now() - started < 30_000) {
        const services = options.getWindowServices();
        if (services?.windowManager?.registerWindow &&
            (services.getContext || services.getContextForWebContents)) {
            return services;
        }
        await delay(100);
    }
    throw new Error("Timed out waiting for Codex window services");
}
function callHiddenBridge(method, args) {
    assertBridgeMethod(method);
    return ensureBrowserUiHost().then((host) => {
        const id = (0, node_crypto_1.randomUUID)();
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                bridgeRequests.delete(id);
                reject(new Error(`Timed out waiting for browser UI bridge method: ${method}`));
            }, 15_000);
            bridgeRequests.set(id, { resolve, reject, timer });
            host.webContents.send(BRIDGE_REQUEST_CHANNEL, { id, method, args });
        });
    });
}
function bridgeMessagePortToWebSocket(port, ws) {
    let closed = false;
    const close = () => {
        if (closed)
            return;
        closed = true;
        try {
            port.postMessage(null);
        }
        catch { }
        try {
            port.close();
        }
        catch { }
        ws.close();
    };
    port.start();
    port.on("message", (event) => {
        if (closed)
            return;
        if (event.data == null) {
            close();
            return;
        }
        if (typeof event.data === "string") {
            ws.sendText(event.data);
        }
    });
    port.on("close", close);
    ws.onText((text) => {
        if (closed)
            return;
        port.postMessage(text);
    });
    ws.onClose(close);
}
function broadcastControl(payload) {
    for (const client of [...controlClients]) {
        try {
            client.sendJson(payload);
        }
        catch {
            client.close();
            controlClients.delete(client);
        }
    }
}
function browserBridgeScript(state) {
    return `
(() => {
  const initialState = ${safeJson(state)};
  const snapshot = new Map(Object.entries(initialState.snapshot || {}));
  const workerSubscribers = new Map();
  const themeSubscribers = new Set();
  const browserSidebarSnapshots = new Map();
  const browserSidebarSeededLocalServers = new Set();
  let systemThemeVariant = initialState.systemThemeVariant || "light";

  window.__codexppBrowserUi = true;
  installBrowserUiWebviewShim();

  const control = new WebSocket(new URL("/codexpp/browser-ui/control", location.href));
  control.addEventListener("message", (event) => {
    let payload;
    try { payload = JSON.parse(event.data); } catch { return; }
    if (payload.type === "message-for-view") {
      const message = payload.message;
      if (message && message.type === "shared-object-updated") {
        if (message.value === undefined) snapshot.delete(message.key);
        else snapshot.set(message.key, message.value);
      }
      rememberBrowserSidebarHostMessage(message);
      window.dispatchEvent(new MessageEvent("message", { data: message }));
    } else if (payload.type === "worker-message") {
      const subs = workerSubscribers.get(payload.workerId);
      if (subs) for (const fn of [...subs]) fn(payload.message);
    } else if (payload.type === "system-theme-variant-updated") {
      systemThemeVariant = payload.value;
      for (const fn of [...themeSubscribers]) fn();
    }
  });

  async function bridge(method, args = []) {
    const res = await fetch("/codexpp/browser-ui/bridge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method, args }),
    });
    const body = await res.json();
    if (!body.ok) throw new Error(body.error || "Codex++ browser bridge failed");
    return body.value;
  }

  function legacyBrowserTabId(conversationId) {
    return String(conversationId || "new-conversation") + ":legacy";
  }

  function browserSidebarKey(conversationId, browserTabId) {
    return String(conversationId || "new-conversation") + "::" + String(browserTabId || legacyBrowserTabId(conversationId));
  }

  function normalizeBrowserUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      return new URL(raw).href;
    } catch {}
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return raw;
    try {
      return new URL("https://" + raw).href;
    } catch {
      return raw;
    }
  }

  function browserTitleForUrl(url) {
    if (!url) return "New tab";
    try {
      const host = new URL(url).hostname.replace(/^www\\./, "");
      return host || url;
    } catch {
      return url;
    }
  }

  function makeBrowserSidebarSnapshot(url, patch = {}) {
    const normalized = normalizeBrowserUrl(url);
    return {
      tabType: normalized ? "web" : "new-tab-page",
      isSuspended: false,
      title: normalized ? browserTitleForUrl(normalized) : "New tab",
      url: normalized,
      faviconUrl: null,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      zoomPercent: 100,
      commentModeDisabledReason: null,
      interactionMode: "browse",
      annotationEditorMode: "comment",
      isAnnotationAddModifierPressed: false,
      isOriginalViewEnabled: false,
      isTweaksEditorOpen: false,
      comments: [],
      ...patch,
    };
  }

  function dispatchBrowserSidebarMessage(message) {
    window.dispatchEvent(new MessageEvent("message", { data: message }));
  }

  function seedBrowserSidebarLocalServers(conversationId) {
    if (!conversationId || browserSidebarSeededLocalServers.has(conversationId)) return;
    browserSidebarSeededLocalServers.add(conversationId);
    queueMicrotask(() => {
      dispatchBrowserSidebarMessage({
        type: "browser-sidebar-local-servers",
        conversationId,
        state: { isLoading: false, servers: [], hiddenServers: [] },
      });
    });
  }

  function rememberBrowserSidebarHostMessage(message) {
    if (!message || typeof message !== "object") return;
    if (message.type === "browser-sidebar-state") {
      const conversationId = message.conversationId;
      if (!conversationId || !message.snapshot) return;
      browserSidebarSnapshots.set(browserSidebarKey(conversationId, message.browserTabId), message.snapshot);
    } else if (message.type === "browser-sidebar-local-servers") {
      if (message.conversationId) browserSidebarSeededLocalServers.add(message.conversationId);
    }
  }

  function sendBrowserSidebarSnapshot(conversationId, browserTabId, snapshotPatch) {
    if (!conversationId) return;
    const key = browserSidebarKey(conversationId, browserTabId);
    const previous = browserSidebarSnapshots.get(key) || makeBrowserSidebarSnapshot("");
    const next = { ...previous, ...snapshotPatch };
    browserSidebarSnapshots.set(key, next);
    dispatchBrowserSidebarMessage({
      type: "browser-sidebar-state",
      conversationId,
      ...(browserTabId ? { browserTabId } : {}),
      snapshot: next,
    });
  }

  function setBrowserSidebarUrl(conversationId, browserTabId, url, isLoading = false) {
    const normalized = normalizeBrowserUrl(url);
    sendBrowserSidebarSnapshot(conversationId, browserTabId, makeBrowserSidebarSnapshot(normalized, { isLoading }));
  }

  function findBrowserSidebarFrame(conversationId, browserTabId) {
    const selector = "[data-browser-sidebar-conversation-id='" + cssEscape(conversationId) + "'][data-browser-sidebar-browser-tab-id='" + cssEscape(browserTabId || legacyBrowserTabId(conversationId)) + "']";
    return document.querySelector(selector);
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value));
    return String(value).replace(/['\\\\]/g, "\\\\$&");
  }

  function handleBrowserSidebarViewMessage(message) {
    if (!message || typeof message !== "object") return;
    if (message.type === "browser-sidebar-sync") {
      const payload = message.payload || {};
      seedBrowserSidebarLocalServers(payload.conversationId);
      return;
    }
    if (message.type === "browser-sidebar-owner-sync") {
      seedBrowserSidebarLocalServers(message.conversationId);
      return;
    }
    if (message.type !== "browser-sidebar-command") return;

    const conversationId = message.conversationId;
    const browserTabId = message.browserTabId;
    const command = message.command || {};
    seedBrowserSidebarLocalServers(conversationId);

    if (command.type === "navigate") {
      const normalized = normalizeBrowserUrl(command.url);
      setBrowserSidebarUrl(conversationId, browserTabId, normalized, true);
      queueMicrotask(() => {
        const frame = findBrowserSidebarFrame(conversationId, browserTabId);
        if (!frame || !normalized || frame.getURL?.() === normalized) return;
        frame.loadURL?.(normalized);
      });
      window.setTimeout(() => setBrowserSidebarUrl(conversationId, browserTabId, normalized, false), 500);
    } else if (command.type === "reload") {
      const frame = findBrowserSidebarFrame(conversationId, browserTabId);
      frame?.reload?.();
      const current = browserSidebarSnapshots.get(browserSidebarKey(conversationId, browserTabId));
      if (current?.url) {
        sendBrowserSidebarSnapshot(conversationId, browserTabId, { ...current, isLoading: true });
        window.setTimeout(() => sendBrowserSidebarSnapshot(conversationId, browserTabId, { ...current, isLoading: false }), 250);
      }
    } else if (command.type === "go-back") {
      findBrowserSidebarFrame(conversationId, browserTabId)?.goBack?.();
    } else if (command.type === "go-forward") {
      findBrowserSidebarFrame(conversationId, browserTabId)?.goForward?.();
    } else if (command.type === "stop") {
      const current = browserSidebarSnapshots.get(browserSidebarKey(conversationId, browserTabId));
      if (current) sendBrowserSidebarSnapshot(conversationId, browserTabId, { ...current, isLoading: false });
    } else if (command.type === "reset" || command.type === "close-tab") {
      sendBrowserSidebarSnapshot(conversationId, browserTabId, makeBrowserSidebarSnapshot(""));
    }
  }

  window.codexWindowType = "electron";
  window.electronBridge = {
    windowType: "electron",
    sendMessageFromView: (message) => {
      if (message && message.type === "shared-object-set") snapshot.set(message.key, message.value);
      handleBrowserSidebarViewMessage(message);
      return bridge("sendMessageFromView", [message]);
    },
    getPathForFile: () => null,
    sendWorkerMessageFromView: (workerId, message) => bridge("sendWorkerMessageFromView", [workerId, message]),
    subscribeToWorkerMessages: (workerId, handler) => {
      let subs = workerSubscribers.get(workerId);
      if (!subs) {
        subs = new Set();
        workerSubscribers.set(workerId, subs);
        bridge("subscribeWorkerMessages", [workerId]).catch(console.error);
      }
      subs.add(handler);
      return () => {
        const current = workerSubscribers.get(workerId);
        if (!current) return;
        current.delete(handler);
        if (current.size === 0) {
          workerSubscribers.delete(workerId);
          bridge("unsubscribeWorkerMessages", [workerId]).catch(console.error);
        }
      };
    },
    showContextMenu: (items) => bridge("showContextMenu", [items]),
    showApplicationMenu: (menuId, x, y) => bridge("showApplicationMenu", [menuId, x, y]),
    getFastModeRolloutMetrics: (params) => bridge("getFastModeRolloutMetrics", [params]),
    getSharedObjectSnapshotValue: (key) => snapshot.get(key),
    getSystemThemeVariant: () => systemThemeVariant,
    subscribeToSystemThemeVariant: (handler) => {
      themeSubscribers.add(handler);
      return () => themeSubscribers.delete(handler);
    },
    triggerSentryTestError: () => bridge("triggerSentryTestError", []),
    getSentryInitOptions: () => null,
    getAppSessionId: () => null,
    getBuildFlavor: () => initialState.buildFlavor,
    isIntelMacBuild: () => initialState.platform === "darwin" && initialState.arch === "x64",
    usesOwlAppShell: () => initialState.usesOwlAppShell,
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.type !== "connect-app-host") return;
    const port = event.data.port;
    if (!port) return;
    const ws = new WebSocket(new URL("/codexpp/browser-ui/rpc", location.href));
    ws.addEventListener("message", (message) => port.postMessage(message.data));
    ws.addEventListener("close", () => {
      try { port.postMessage(null); } catch {}
      try { port.close(); } catch {}
    });
    ws.addEventListener("open", () => {
      port.onmessage = (message) => {
        if (message.data == null) {
          ws.close();
          return;
        }
        ws.send(message.data);
      };
      port.start && port.start();
    });
  });

  function installBrowserUiWebviewShim() {
    if (window.__codexppWebviewShimInstalled) return;
    window.__codexppWebviewShimInstalled = true;
    const originalCreateElement = Document.prototype.createElement;
    Document.prototype.createElement = function(tagName, options) {
      if (String(tagName).toLowerCase() !== "webview") {
        return originalCreateElement.call(this, tagName, options);
      }
      return createWebviewIframe(this);
    };

    function createWebviewIframe(doc) {
      const iframe = originalCreateElement.call(doc, "iframe");
      iframe.dataset.codexppWebviewShim = "true";
      iframe.style.border = "0";
      iframe.style.display = "block";
      iframe.style.backgroundColor = "#fff";
      iframe.setAttribute("allow", "autoplay; clipboard-read; clipboard-write; display-capture; fullscreen; microphone; camera");
      const nativeSetAttribute = iframe.setAttribute.bind(iframe);
      const nativeGetAttribute = iframe.getAttribute.bind(iframe);

      try {
        Object.defineProperty(iframe, "tagName", { configurable: true, get: () => "WEBVIEW" });
        Object.defineProperty(iframe, "nodeName", { configurable: true, get: () => "WEBVIEW" });
      } catch {}

      const emit = (type, extra = {}) => {
        const event = new Event(type);
        Object.assign(event, extra);
        iframe.dispatchEvent(event);
      };
      const currentUrl = () => iframe.dataset.codexppRequestedSrc || nativeGetAttribute("src") || "about:blank";
      const actualFrameUrl = (url) => {
        const requested = String(url || "about:blank");
        if (!shouldBreakRecursiveFrameLoad(requested)) return requested;
        try {
          const next = new URL(requested, location.href);
          next.searchParams.set("__codexpp_frame_depth", String(frameAncestorDepth() + 1));
          return next.href;
        } catch {
          return requested;
        }
      };
      const setFrameUrl = (url) => {
        const requested = String(url || "about:blank");
        iframe.dataset.codexppRequestedSrc = requested;
        nativeSetAttribute("src", actualFrameUrl(requested));
      };
      const navigate = (url) => {
        const next = String(url || "about:blank");
        emit("did-start-loading", { url: next });
        setFrameUrl(next);
      };

      iframe.setAttribute = (name, value) => {
        if (String(name).toLowerCase() === "src") {
          setFrameUrl(value);
          return;
        }
        nativeSetAttribute(name, value);
      };

      try {
        Object.defineProperty(iframe, "src", {
          configurable: true,
          get: () => currentUrl(),
          set: (value) => setFrameUrl(value),
        });
      } catch {}

      iframe.addEventListener("load", () => {
        const url = currentUrl();
        emit("dom-ready", { url });
        emit("did-navigate", { url });
        emit("did-stop-loading", { url });
        emit("did-finish-load", { url });
        let title = "";
        try {
          title = iframe.contentDocument?.title || "";
        } catch {}
        const conversationId = iframe.getAttribute("data-browser-sidebar-conversation-id");
        const browserTabId = iframe.getAttribute("data-browser-sidebar-browser-tab-id");
        if (conversationId) {
          sendBrowserSidebarSnapshot(conversationId, browserTabId, makeBrowserSidebarSnapshot(url, {
            title: title || browserTitleForUrl(url),
            isLoading: false,
          }));
        }
        if (title) emit("page-title-updated", { title });
      });
      iframe.addEventListener("error", () => {
        emit("did-fail-load", { errorCode: -2, errorDescription: "iframe load failed", validatedURL: currentUrl() });
        emit("did-stop-loading", { url: currentUrl() });
      });

      Object.defineProperties(iframe, {
        destroy: { value: () => iframe.remove() },
        getURL: { value: () => currentUrl() },
        getTitle: {
          value: () => {
            try {
              return iframe.contentDocument?.title || "";
            } catch {
              return "";
            }
          },
        },
        loadURL: { value: (url) => { navigate(url); return Promise.resolve(); } },
        reload: {
          value: () => {
            try {
              iframe.contentWindow?.location.reload();
            } catch {
              navigate(currentUrl());
            }
          },
        },
        stop: { value: () => {} },
        canGoBack: { value: () => false },
        canGoForward: { value: () => false },
        goBack: {
          value: () => {
            try {
              iframe.contentWindow?.history.back();
            } catch {}
          },
        },
        goForward: {
          value: () => {
            try {
              iframe.contentWindow?.history.forward();
            } catch {}
          },
        },
        executeJavaScript: {
          value: (code) => {
            try {
              return Promise.resolve(iframe.contentWindow?.eval(String(code)));
            } catch (error) {
              return Promise.reject(error);
            }
          },
        },
        insertCSS: { value: () => Promise.resolve("") },
        openDevTools: { value: () => {} },
        closeDevTools: { value: () => {} },
        isDevToolsOpened: { value: () => false },
        send: { value: () => {} },
      });

      return iframe;
    }

    function frameAncestorDepth() {
      let depth = 0;
      let current = window;
      const seen = new Set();
      while (current && !seen.has(current)) {
        seen.add(current);
        let parent;
        try {
          parent = current.parent;
        } catch {
          break;
        }
        if (parent === current) break;
        depth += 1;
        current = parent;
      }
      return depth;
    }

    function shouldBreakRecursiveFrameLoad(url) {
      let target;
      try {
        target = new URL(url, location.href).href;
      } catch {
        return false;
      }
      let current = window;
      const seen = new Set();
      while (current && !seen.has(current)) {
        seen.add(current);
        try {
          if (new URL(current.location.href).href === target) return true;
          if (current.parent === current) break;
          current = current.parent;
        } catch {
          return false;
        }
      }
      return false;
    }
  }
})();
`;
}
function hideVisibleCodexWindows() {
    if (process.platform === "darwin") {
        try {
            electron_1.app.hide();
        }
        catch { }
    }
    for (const win of electron_1.BrowserWindow.getAllWindows()) {
        if (win.isDestroyed())
            continue;
        if (activeHost && win.webContents.id === activeHost.webContents.id)
            continue;
        if (!win.isVisible())
            continue;
        try {
            win.hide();
        }
        catch { }
    }
}
function makeWindowLikeForView(view) {
    const viewBounds = () => view.getBounds();
    return {
        id: view.webContents.id,
        webContents: view.webContents,
        on: (event, listener) => {
            if (event === "closed")
                view.webContents.once("destroyed", listener);
            else
                view.webContents.on(event, listener);
            return view;
        },
        once: (event, listener) => {
            view.webContents.once(event, listener);
            return view;
        },
        off: (event, listener) => {
            view.webContents.off(event, listener);
            return view;
        },
        removeListener: (event, listener) => {
            view.webContents.removeListener(event, listener);
            return view;
        },
        isDestroyed: () => view.webContents.isDestroyed(),
        isFocused: () => view.webContents.isFocused(),
        focus: () => view.webContents.focus(),
        show: () => { },
        hide: () => { },
        getBounds: viewBounds,
        getContentBounds: viewBounds,
        getSize: () => {
            const b = viewBounds();
            return [b.width, b.height];
        },
        getContentSize: () => {
            const b = viewBounds();
            return [b.width, b.height];
        },
        setTitle: () => { },
        getTitle: () => "",
        setRepresentedFilename: () => { },
        setDocumentEdited: () => { },
        setWindowButtonVisibility: () => { },
    };
}
function acceptWebSocket(req, socket, head) {
    const key = req.headers["sec-websocket-key"];
    if (typeof key !== "string")
        throw new Error("missing Sec-WebSocket-Key");
    const accept = (0, node_crypto_1.createHash)("sha1")
        .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
        .digest("base64");
    socket.write([
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${accept}`,
        "\r\n",
    ].join("\r\n"));
    const ws = new WebSocketConnection(socket);
    if (head.length > 0)
        ws.acceptHead(head);
    return ws;
}
class WebSocketConnection {
    socket;
    buffer = Buffer.alloc(0);
    textHandlers = new Set();
    closeHandlers = new Set();
    closed = false;
    constructor(socket) {
        this.socket = socket;
        socket.on("data", (chunk) => this.acceptHead(chunk));
        socket.on("close", () => this.emitClose());
        socket.on("error", () => this.emitClose());
    }
    acceptHead(chunk) {
        if (this.closed)
            return;
        this.buffer = Buffer.concat([this.buffer, chunk]);
        this.readFrames();
    }
    onText(handler) {
        this.textHandlers.add(handler);
    }
    onClose(handler) {
        this.closeHandlers.add(handler);
    }
    sendJson(payload) {
        this.sendText(JSON.stringify(payload));
    }
    sendText(text) {
        this.sendFrame(0x1, Buffer.from(text, "utf8"));
    }
    close() {
        if (this.closed)
            return;
        try {
            this.sendFrame(0x8, Buffer.alloc(0));
        }
        catch { }
        this.closed = true;
        this.socket.end();
        this.emitClose();
    }
    readFrames() {
        while (this.buffer.length >= 2) {
            const first = this.buffer[0];
            const second = this.buffer[1];
            const opcode = first & 0x0f;
            const masked = (second & 0x80) !== 0;
            let length = second & 0x7f;
            let offset = 2;
            if (length === 126) {
                if (this.buffer.length < offset + 2)
                    return;
                length = this.buffer.readUInt16BE(offset);
                offset += 2;
            }
            else if (length === 127) {
                if (this.buffer.length < offset + 8)
                    return;
                const high = this.buffer.readUInt32BE(offset);
                const low = this.buffer.readUInt32BE(offset + 4);
                if (high !== 0) {
                    this.close();
                    return;
                }
                length = low;
                offset += 8;
            }
            const maskOffset = offset;
            if (masked)
                offset += 4;
            if (this.buffer.length < offset + length)
                return;
            const mask = masked ? this.buffer.subarray(maskOffset, maskOffset + 4) : null;
            const payload = Buffer.from(this.buffer.subarray(offset, offset + length));
            this.buffer = this.buffer.subarray(offset + length);
            if (mask) {
                for (let i = 0; i < payload.length; i += 1)
                    payload[i] ^= mask[i % 4];
            }
            if (opcode === 0x8) {
                this.close();
            }
            else if (opcode === 0x9) {
                this.sendFrame(0xA, payload);
            }
            else if (opcode === 0x1) {
                const text = payload.toString("utf8");
                for (const handler of [...this.textHandlers])
                    handler(text);
            }
        }
    }
    sendFrame(opcode, payload) {
        if (this.closed && opcode !== 0x8)
            return;
        const length = payload.length;
        let header;
        if (length < 126) {
            header = Buffer.from([0x80 | opcode, length]);
        }
        else if (length <= 0xffff) {
            header = Buffer.alloc(4);
            header[0] = 0x80 | opcode;
            header[1] = 126;
            header.writeUInt16BE(length, 2);
        }
        else {
            header = Buffer.alloc(10);
            header[0] = 0x80 | opcode;
            header[1] = 127;
            header.writeUInt32BE(0, 2);
            header.writeUInt32BE(length, 6);
        }
        this.socket.write(Buffer.concat([header, payload]));
    }
    emitClose() {
        if (!this.closed)
            this.closed = true;
        for (const handler of [...this.closeHandlers])
            handler();
        this.closeHandlers.clear();
        this.textHandlers.clear();
    }
}
function requestUrl(req) {
    try {
        return new URL(req.url ?? "/", "http://127.0.0.1");
    }
    catch {
        return null;
    }
}
function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;
        req.on("data", (chunk) => {
            total += chunk.length;
            if (total > 1024 * 1024) {
                reject(new Error("request body too large"));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf8");
            if (!raw) {
                resolve(null);
                return;
            }
            try {
                resolve(JSON.parse(raw));
            }
            catch (error) {
                reject(error);
            }
        });
        req.on("error", reject);
    });
}
function sendJson(res, status, body) {
    sendBuffer(res, status, Buffer.from(JSON.stringify(body)), MIME_TYPES[".json"], false);
}
function sendText(res, status, body, contentType) {
    sendBuffer(res, status, Buffer.from(body), contentType, false);
}
function sendBuffer(res, status, body, contentType, headOnly) {
    res.writeHead(status, {
        "content-type": contentType,
        "content-length": body.length,
        "cache-control": "no-store",
    });
    if (headOnly)
        res.end();
    else
        res.end(body);
}
function webviewRoot() {
    return (0, node_path_1.join)(process.resourcesPath, "app.asar", "webview");
}
function webviewFile(pathname) {
    const cleanPath = decodeURIComponent(pathname).replace(/^\/+/, "");
    if (!cleanPath || cleanPath.includes("\0"))
        return null;
    const root = webviewRoot();
    const file = (0, node_path_1.normalize)((0, node_path_1.join)(root, cleanPath));
    const rel = (0, node_path_1.relative)(root, file);
    if (rel.startsWith("..") || rel === "")
        return null;
    if (!(0, node_fs_1.existsSync)(file) || !(0, node_fs_1.statSync)(file).isFile())
        return null;
    return file;
}
function mimeType(file) {
    const dot = file.lastIndexOf(".");
    const ext = dot >= 0 ? file.slice(dot).toLowerCase() : "";
    return MIME_TYPES[ext] ?? "application/octet-stream";
}
function requireOptions() {
    if (!activeOptions)
        throw new Error("Codex++ browser UI server is not configured");
    return activeOptions;
}
function isBrowserUiHostSender(sender) {
    return !!activeHost && !activeHost.webContents.isDestroyed() && sender.id === activeHost.webContents.id;
}
function assertBridgeMethod(method) {
    if (!/^[a-zA-Z0-9._:-]+$/.test(method))
        throw new Error("invalid bridge method");
}
function parsePort(value, fallback) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : fallback;
}
function asRecord(value) {
    return value && typeof value === "object" ? value : null;
}
function asPlainObject(value) {
    const record = asRecord(value);
    return record && !Array.isArray(record) ? record : {};
}
function currentSystemThemeVariant() {
    return electron_1.nativeTheme.shouldUseDarkColors ? "dark" : "light";
}
function safeJson(value) {
    return JSON.stringify(value).replace(/</g, "\\u003c");
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=browser-ui.js.map