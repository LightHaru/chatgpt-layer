"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION_RE = exports.UPDATE_CHECK_INTERVAL_MS = void 0;
exports.installSparkleUpdateHook = installSparkleUpdateHook;
exports.wrapSparkleExports = wrapSparkleExports;
exports.prepareSignedCodexForSparkleInstall = prepareSignedCodexForSparkleInstall;
exports.isDeveloperIdSignedApp = isDeveloperIdSignedApp;
exports.inferMacAppRoot = inferMacAppRoot;
exports.ensureCodexPlusPlusUpdateCheck = ensureCodexPlusPlusUpdateCheck;
exports.normalizeVersion = normalizeVersion;
exports.compareVersions = compareVersions;
exports.fallbackSourceRoot = fallbackSourceRoot;
exports.describeInstallationSource = describeInstallationSource;
exports.startInstalledCli = startInstalledCli;
exports.startInstalledCliWithLaunchd = startInstalledCliWithLaunchd;
exports.shellQuote = shellQuote;
exports.markSelfUpdateStarted = markSelfUpdateStarted;
const node_fs_1 = require("node:fs");
const node_child_process_1 = require("node:child_process");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const config_state_1 = require("./config-state");
const runtime_paths_1 = require("./runtime-paths");
function installSparkleUpdateHook() {
    if (process.platform !== "darwin")
        return;
    const Module = require("node:module");
    const originalLoad = Module._load;
    if (typeof originalLoad !== "function")
        return;
    Module._load = function codexPlusPlusModuleLoad(request, parent, isMain) {
        const loaded = originalLoad.apply(this, [request, parent, isMain]);
        if (typeof request === "string" && /sparkle(?:\.node)?$/i.test(request)) {
            wrapSparkleExports(loaded);
        }
        return loaded;
    };
}
function wrapSparkleExports(loaded) {
    if (!loaded || typeof loaded !== "object")
        return;
    const exports = loaded;
    if (exports.__codexppSparkleWrapped)
        return;
    exports.__codexppSparkleWrapped = true;
    for (const name of ["installUpdatesIfAvailable"]) {
        const fn = exports[name];
        if (typeof fn !== "function")
            continue;
        exports[name] = function codexPlusPlusSparkleWrapper(...args) {
            prepareSignedCodexForSparkleInstall();
            return Reflect.apply(fn, this, args);
        };
    }
    if (exports.default && exports.default !== exports) {
        wrapSparkleExports(exports.default);
    }
}
function prepareSignedCodexForSparkleInstall() {
    if (process.platform !== "darwin")
        return;
    if ((0, node_fs_1.existsSync)(runtime_paths_1.UPDATE_MODE_FILE)) {
        (0, runtime_paths_1.log)("info", "Sparkle update prep skipped; update mode already active");
        return;
    }
    if (!(0, node_fs_1.existsSync)(runtime_paths_1.SIGNED_CODEX_BACKUP)) {
        (0, runtime_paths_1.log)("warn", "Sparkle update prep skipped; signed Codex.app backup is missing");
        return;
    }
    if (!isDeveloperIdSignedApp(runtime_paths_1.SIGNED_CODEX_BACKUP)) {
        (0, runtime_paths_1.log)("warn", "Sparkle update prep skipped; Codex.app backup is not Developer ID signed");
        return;
    }
    const state = (0, config_state_1.readInstallerState)();
    const appRoot = state?.appRoot ?? inferMacAppRoot();
    if (!appRoot) {
        (0, runtime_paths_1.log)("warn", "Sparkle update prep skipped; could not infer Codex.app path");
        return;
    }
    const mode = {
        enabledAt: new Date().toISOString(),
        appRoot,
        codexVersion: state?.codexVersion ?? null,
    };
    (0, node_fs_1.writeFileSync)(runtime_paths_1.UPDATE_MODE_FILE, JSON.stringify(mode, null, 2));
    try {
        (0, node_child_process_1.execFileSync)("ditto", [runtime_paths_1.SIGNED_CODEX_BACKUP, appRoot], { stdio: "ignore" });
        try {
            (0, node_child_process_1.execFileSync)("xattr", ["-dr", "com.apple.quarantine", appRoot], { stdio: "ignore" });
        }
        catch { }
        (0, runtime_paths_1.log)("info", "Restored signed Codex.app before Sparkle install", { appRoot });
    }
    catch (e) {
        (0, runtime_paths_1.log)("error", "Failed to restore signed Codex.app before Sparkle install", {
            message: e.message,
        });
    }
}
function isDeveloperIdSignedApp(appRoot) {
    const result = (0, node_child_process_1.spawnSync)("codesign", ["-dv", "--verbose=4", appRoot], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    return (result.status === 0 &&
        /Authority=Developer ID Application:/.test(output) &&
        !/Signature=adhoc/.test(output) &&
        !/TeamIdentifier=not set/.test(output));
}
function inferMacAppRoot() {
    const marker = ".app/Contents/MacOS/";
    const idx = process.execPath.indexOf(marker);
    return idx >= 0 ? process.execPath.slice(0, idx + ".app".length) : null;
}
exports.UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
exports.VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;
async function ensureCodexPlusPlusUpdateCheck(force = false) {
    const state = (0, config_state_1.readState)();
    const cached = state.codexPlusPlus?.updateCheck;
    const channel = state.codexPlusPlus?.updateChannel ?? "stable";
    const repo = state.codexPlusPlus?.updateRepo ?? runtime_paths_1.CODEX_PLUSPLUS_REPO;
    if (!force &&
        cached &&
        cached.currentVersion === runtime_paths_1.CODEX_PLUSPLUS_VERSION &&
        Date.now() - Date.parse(cached.checkedAt) < exports.UPDATE_CHECK_INTERVAL_MS) {
        return cached;
    }
    const release = await fetchLatestRelease(repo, runtime_paths_1.CODEX_PLUSPLUS_VERSION, channel === "prerelease");
    const latestVersion = release.latestTag ? normalizeVersion(release.latestTag) : null;
    const check = {
        checkedAt: new Date().toISOString(),
        currentVersion: runtime_paths_1.CODEX_PLUSPLUS_VERSION,
        latestVersion,
        releaseUrl: release.releaseUrl ?? `https://github.com/${repo}/releases`,
        releaseNotes: release.releaseNotes,
        updateAvailable: latestVersion
            ? compareVersions(normalizeVersion(latestVersion), runtime_paths_1.CODEX_PLUSPLUS_VERSION) > 0
            : false,
        ...(release.error ? { error: release.error } : {}),
    };
    state.codexPlusPlus ??= {};
    state.codexPlusPlus.updateCheck = check;
    (0, config_state_1.writeState)(state);
    return check;
}
async function fetchLatestRelease(repo, currentVersion, includePrerelease = false) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const endpoint = includePrerelease ? "releases?per_page=20" : "releases/latest";
            const res = await fetch(`https://api.github.com/repos/${repo}/${endpoint}`, {
                headers: {
                    "Accept": "application/vnd.github+json",
                    "User-Agent": `codex-plusplus/${currentVersion}`,
                },
                signal: controller.signal,
            });
            if (res.status === 404) {
                return { latestTag: null, releaseUrl: null, releaseNotes: null, error: "no GitHub release found" };
            }
            if (!res.ok) {
                return { latestTag: null, releaseUrl: null, releaseNotes: null, error: `GitHub returned ${res.status}` };
            }
            const json = await res.json();
            const body = Array.isArray(json) ? json.find((release) => !release.draft) : json;
            if (!body) {
                return { latestTag: null, releaseUrl: null, releaseNotes: null, error: "no GitHub release found" };
            }
            return {
                latestTag: body.tag_name ?? null,
                releaseUrl: body.html_url ?? `https://github.com/${repo}/releases`,
                releaseNotes: body.body ?? null,
            };
        }
        finally {
            clearTimeout(timeout);
        }
    }
    catch (e) {
        return {
            latestTag: null,
            releaseUrl: null,
            releaseNotes: null,
            error: e instanceof Error ? e.message : String(e),
        };
    }
}
function normalizeVersion(v) {
    return v.trim().replace(/^v/i, "");
}
function compareVersions(a, b) {
    const av = exports.VERSION_RE.exec(a);
    const bv = exports.VERSION_RE.exec(b);
    if (!av || !bv)
        return 0;
    for (let i = 1; i <= 3; i++) {
        const diff = Number(av[i]) - Number(bv[i]);
        if (diff !== 0)
            return diff;
    }
    return 0;
}
function fallbackSourceRoot() {
    const candidates = [
        (0, node_path_1.join)((0, node_os_1.homedir)(), ".codex-plusplus", "source"),
        (0, node_path_1.join)(runtime_paths_1.userRoot, "source"),
    ];
    for (const candidate of candidates) {
        if ((0, node_fs_1.existsSync)((0, node_path_1.join)(candidate, "packages", "installer", "dist", "cli.js")))
            return candidate;
    }
    return null;
}
function describeInstallationSource(sourceRoot) {
    if (!sourceRoot) {
        return {
            kind: "unknown",
            label: "Unknown",
            detail: "Codex++ source location is not recorded yet.",
        };
    }
    const normalized = sourceRoot.replace(/\\/g, "/");
    if (/\/(?:Homebrew|homebrew)\/Cellar\/codexplusplus\//.test(normalized)) {
        return { kind: "homebrew", label: "Homebrew", detail: sourceRoot };
    }
    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(sourceRoot, ".git"))) {
        return { kind: "local-dev", label: "Local development checkout", detail: sourceRoot };
    }
    if (normalized.endsWith("/.codex-plusplus/source") || normalized.includes("/.codex-plusplus/source/")) {
        return { kind: "github-source", label: "GitHub source installer", detail: sourceRoot };
    }
    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(sourceRoot, "package.json"))) {
        return { kind: "source-archive", label: "Source archive", detail: sourceRoot };
    }
    return { kind: "unknown", label: "Unknown", detail: sourceRoot };
}
function startInstalledCli(cli, args) {
    if (process.platform === "darwin" && startInstalledCliWithLaunchd(cli, args)) {
        return;
    }
    const child = (0, node_child_process_1.spawn)(process.execPath, [cli, ...args], {
        cwd: (0, node_path_1.resolve)((0, node_path_1.dirname)(cli), "..", "..", ".."),
        env: { ...process.env, CODEX_PLUSPLUS_MANUAL_UPDATE: "1" },
        detached: true,
        stdio: "ignore",
    });
    child.unref();
}
function startInstalledCliWithLaunchd(cli, args) {
    const label = `com.codexplusplus.patch-helper.${process.pid}.${Date.now()}`;
    const cleanup = `launchctl remove ${label} >/dev/null 2>&1 || launchctl bootout gui/$(id -u)/${label} >/dev/null 2>&1 || true`;
    const command = [
        `trap ${shellQuote(cleanup)} EXIT`,
        `cd ${shellQuote((0, node_path_1.resolve)((0, node_path_1.dirname)(cli), "..", "..", ".."))}`,
        `CODEX_PLUSPLUS_MANUAL_UPDATE=1 ${[process.execPath, cli, ...args].map(shellQuote).join(" ")}`,
    ].join(" && ");
    const result = (0, node_child_process_1.spawnSync)("launchctl", [
        "submit",
        "-l",
        label,
        "--",
        "/bin/sh",
        "-c",
        `${command} || true`,
    ], {
        encoding: "utf8",
        stdio: "ignore",
    });
    if (result.status === 0)
        return true;
    (0, runtime_paths_1.log)("warn", `launchctl submit failed for Codex++ patch helper: ${result.error?.message ?? result.status}`);
    return false;
}
function shellQuote(value) {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}
function markSelfUpdateStarted(sourceRoot) {
    const config = (0, config_state_1.readState)().codexPlusPlus;
    const channel = config?.updateChannel ?? "stable";
    const state = {
        checkedAt: new Date().toISOString(),
        status: "checking",
        currentVersion: runtime_paths_1.CODEX_PLUSPLUS_VERSION,
        latestVersion: null,
        targetRef: config?.updateChannel === "custom" ? config.updateRef ?? null : null,
        releaseUrl: null,
        repo: config?.updateRepo ?? runtime_paths_1.CODEX_PLUSPLUS_REPO,
        channel,
        sourceRoot,
        installationSource: describeInstallationSource(sourceRoot),
    };
    (0, config_state_1.writeSelfUpdateState)(state);
    return state;
}
//# sourceMappingURL=self-update.js.map