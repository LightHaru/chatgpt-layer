"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreTweakModifiedError = exports.VERSION_RE = void 0;
exports.storeEntryPlatformCompatibility = storeEntryPlatformCompatibility;
exports.assertStoreEntryPlatformCompatible = assertStoreEntryPlatformCompatible;
exports.storeEntryRuntimeCompatibility = storeEntryRuntimeCompatibility;
exports.assertStoreEntryRuntimeCompatible = assertStoreEntryRuntimeCompatible;
exports.cleanMinRuntime = cleanMinRuntime;
exports.formatStorePlatforms = formatStorePlatforms;
exports.readBundledStoreRegistry = readBundledStoreRegistry;
exports.fetchTweakStoreRegistry = fetchTweakStoreRegistry;
exports.installStoreTweak = installStoreTweak;
exports.prepareTweakStoreSubmission = prepareTweakStoreSubmission;
exports.extractTarArchive = extractTarArchive;
exports.validateStoreTweakSource = validateStoreTweakSource;
exports.findTweakRoot = findTweakRoot;
exports.copyTweakSource = copyTweakSource;
exports.readStoreInstallMetadata = readStoreInstallMetadata;
exports.hashTweakSource = hashTweakSource;
exports.collectTweakFileHashes = collectTweakFileHashes;
exports.sameFileHashes = sameFileHashes;
exports.isHashRecord = isHashRecord;
exports.normalizeVersion = normalizeVersion;
exports.compareVersions = compareVersions;
const node_fs_1 = require("node:fs");
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = require("node:crypto");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const tweak_store_integrity_1 = require("./tweak-store-integrity");
const tweak_store_1 = require("./tweak-store");
const runtime_paths_1 = require("./runtime-paths");
exports.VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;
class StoreTweakModifiedError extends Error {
    constructor(tweakName) {
        super(`${tweakName} has local source changes, so Codex++ can't auto-update it. Revert your local changes or reinstall the tweak manually.`);
        this.name = "StoreTweakModifiedError";
    }
}
exports.StoreTweakModifiedError = StoreTweakModifiedError;
function storeEntryPlatformCompatibility(entry) {
    const supported = entry.platforms ?? null;
    const compatible = !supported || supported.includes(process.platform);
    return {
        current: process.platform,
        supported,
        compatible,
        reason: compatible ? null : `${entry.manifest.name} is only available on ${formatStorePlatforms(supported)}.`,
    };
}
function assertStoreEntryPlatformCompatible(entry) {
    const platform = storeEntryPlatformCompatibility(entry);
    if (!platform.compatible) {
        throw new Error(platform.reason ?? `${entry.manifest.name} is not available on this platform.`);
    }
}
function storeEntryRuntimeCompatibility(entry) {
    const required = cleanMinRuntime(entry.manifest.minRuntime);
    const compatible = !required || compareVersions(runtime_paths_1.CODEX_PLUSPLUS_VERSION, required) >= 0;
    return {
        current: runtime_paths_1.CODEX_PLUSPLUS_VERSION,
        required,
        compatible,
        reason: compatible || !required
            ? null
            : `${entry.manifest.name} requires Codex++ ${required} or newer.`,
    };
}
function assertStoreEntryRuntimeCompatible(entry) {
    const runtime = storeEntryRuntimeCompatibility(entry);
    if (!runtime.compatible) {
        throw new Error(runtime.reason ?? `${entry.manifest.name} requires a newer Codex++ runtime.`);
    }
}
function cleanMinRuntime(value) {
    if (typeof value !== "string")
        return null;
    const version = normalizeVersion(value.replace(/^>=?\s*/, ""));
    return exports.VERSION_RE.test(version) ? version : null;
}
function formatStorePlatforms(platforms) {
    if (!platforms || platforms.length === 0)
        return "supported platforms";
    return platforms.map((platform) => {
        if (platform === "darwin")
            return "macOS";
        if (platform === "win32")
            return "Windows";
        return "Linux";
    }).join(", ");
}
function readBundledStoreRegistry() {
    const bundled = (0, node_path_1.join)(runtime_paths_1.runtimeDir, "store-index.json");
    if (!(0, node_fs_1.existsSync)(bundled))
        return null;
    try {
        const body = (0, node_fs_1.readFileSync)(bundled);
        if (!process.env.CODEX_PLUSPLUS_ALLOW_STORE_INDEX_OVERRIDE) {
            (0, tweak_store_integrity_1.assertStoreIndexMatchesPin)(body);
        }
        return (0, tweak_store_1.normalizeStoreRegistry)(JSON.parse(body.toString("utf8")));
    }
    catch (e) {
        (0, runtime_paths_1.log)("warn", "bundled store index rejected:", String(e.message));
        return null;
    }
}
async function fetchTweakStoreRegistry() {
    const fetchedAt = new Date().toISOString();
    const allowOverride = process.env.CODEX_PLUSPLUS_ALLOW_STORE_INDEX_OVERRIDE === "1";
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const res = await fetch(runtime_paths_1.TWEAK_STORE_INDEX_URL, {
                headers: {
                    "Accept": "application/json",
                    "User-Agent": `codex-plusplus/${runtime_paths_1.CODEX_PLUSPLUS_VERSION}`,
                },
                signal: controller.signal,
            });
            if (!res.ok)
                throw new Error(`store returned ${res.status}`);
            const body = Buffer.from(await res.arrayBuffer());
            if (!allowOverride)
                (0, tweak_store_integrity_1.assertStoreIndexMatchesPin)(body);
            return {
                registry: (0, tweak_store_1.normalizeStoreRegistry)(JSON.parse(body.toString("utf8"))),
                fetchedAt,
            };
        }
        finally {
            clearTimeout(timeout);
        }
    }
    catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        const bundled = readBundledStoreRegistry();
        if (bundled) {
            (0, runtime_paths_1.log)("warn", "using bundled store index pin:", error.message);
            return { registry: bundled, fetchedAt };
        }
        (0, runtime_paths_1.log)("warn", "failed to fetch tweak store registry:", error.message);
        throw error;
    }
}
async function installStoreTweak(entry) {
    const url = (0, tweak_store_1.storeArchiveUrl)(entry);
    const work = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codexpp-store-tweak-"));
    const archive = (0, node_path_1.join)(work, "source.tar.gz");
    const extractDir = (0, node_path_1.join)(work, "extract");
    const target = (0, node_path_1.join)(runtime_paths_1.TWEAKS_DIR, entry.id);
    const stagedTarget = (0, node_path_1.join)(work, "staged", entry.id);
    try {
        (0, runtime_paths_1.log)("info", `installing store tweak ${entry.id} from ${entry.repo}@${entry.approvedCommitSha}`);
        const res = await fetch(url, {
            headers: { "User-Agent": `codex-plusplus/${runtime_paths_1.CODEX_PLUSPLUS_VERSION}` },
            redirect: "follow",
        });
        if (!res.ok)
            throw new Error(`download failed: ${res.status}`);
        const bytes = Buffer.from(await res.arrayBuffer());
        (0, node_fs_1.writeFileSync)(archive, bytes);
        (0, node_fs_1.mkdirSync)(extractDir, { recursive: true });
        extractTarArchive(archive, extractDir);
        const source = findTweakRoot(extractDir);
        if (!source)
            throw new Error("downloaded archive did not contain manifest.json");
        validateStoreTweakSource(entry, source);
        (0, node_fs_1.rmSync)(stagedTarget, { recursive: true, force: true });
        copyTweakSource(source, stagedTarget);
        const stagedFiles = hashTweakSource(stagedTarget);
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(stagedTarget, ".codexpp-store.json"), JSON.stringify({
            repo: entry.repo,
            approvedCommitSha: entry.approvedCommitSha,
            installedAt: new Date().toISOString(),
            storeIndexUrl: runtime_paths_1.TWEAK_STORE_INDEX_URL,
            files: stagedFiles,
        }, null, 2));
        await assertStoreTweakCleanForAutoUpdate(entry, target, work);
        (0, node_fs_1.rmSync)(target, { recursive: true, force: true });
        (0, node_fs_1.cpSync)(stagedTarget, target, { recursive: true });
    }
    finally {
        (0, node_fs_1.rmSync)(work, { recursive: true, force: true });
    }
}
async function prepareTweakStoreSubmission(repoInput) {
    const repo = (0, tweak_store_1.normalizeGitHubRepo)(repoInput);
    const repoInfo = await fetchGithubJson(`https://api.github.com/repos/${repo}`);
    const defaultBranch = repoInfo.default_branch;
    if (!defaultBranch)
        throw new Error(`Could not resolve default branch for ${repo}`);
    const commit = await fetchGithubJson(`https://api.github.com/repos/${repo}/commits/${encodeURIComponent(defaultBranch)}`);
    if (!commit.sha)
        throw new Error(`Could not resolve current commit for ${repo}`);
    const manifest = await fetchManifestAtCommit(repo, commit.sha).catch((e) => {
        (0, runtime_paths_1.log)("warn", `could not read manifest for store submission ${repo}@${commit.sha}:`, e);
        return undefined;
    });
    return {
        repo,
        defaultBranch,
        commitSha: commit.sha,
        commitUrl: commit.html_url ?? `https://github.com/${repo}/commit/${commit.sha}`,
        manifest: manifest
            ? {
                id: typeof manifest.id === "string" ? manifest.id : undefined,
                name: typeof manifest.name === "string" ? manifest.name : undefined,
                version: typeof manifest.version === "string" ? manifest.version : undefined,
                description: typeof manifest.description === "string" ? manifest.description : undefined,
                iconUrl: typeof manifest.iconUrl === "string" ? manifest.iconUrl : undefined,
            }
            : undefined,
    };
}
async function fetchGithubJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const res = await fetch(url, {
            headers: {
                "Accept": "application/vnd.github+json",
                "User-Agent": `codex-plusplus/${runtime_paths_1.CODEX_PLUSPLUS_VERSION}`,
            },
            signal: controller.signal,
        });
        if (!res.ok)
            throw new Error(`GitHub returned ${res.status}`);
        return await res.json();
    }
    finally {
        clearTimeout(timeout);
    }
}
async function fetchManifestAtCommit(repo, commitSha) {
    const res = await fetch(`https://raw.githubusercontent.com/${repo}/${commitSha}/manifest.json`, {
        headers: {
            "Accept": "application/json",
            "User-Agent": `codex-plusplus/${runtime_paths_1.CODEX_PLUSPLUS_VERSION}`,
        },
    });
    if (!res.ok)
        throw new Error(`manifest fetch returned ${res.status}`);
    return await res.json();
}
function extractTarArchive(archive, targetDir) {
    const result = (0, node_child_process_1.spawnSync)("tar", ["-xzf", archive, "-C", targetDir], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.status !== 0) {
        throw new Error(`tar extraction failed: ${result.stderr || result.stdout || result.status}`);
    }
}
function validateStoreTweakSource(entry, source) {
    const manifestPath = (0, node_path_1.join)(source, "manifest.json");
    const manifest = JSON.parse((0, node_fs_1.readFileSync)(manifestPath, "utf8"));
    if (manifest.id !== entry.manifest.id) {
        throw new Error(`downloaded tweak id ${manifest.id} does not match approved id ${entry.manifest.id}`);
    }
    if (manifest.githubRepo !== entry.repo) {
        throw new Error(`downloaded tweak repo ${manifest.githubRepo} does not match approved repo ${entry.repo}`);
    }
    if (manifest.version !== entry.manifest.version) {
        throw new Error(`downloaded tweak version ${manifest.version} does not match approved version ${entry.manifest.version}`);
    }
}
function findTweakRoot(dir) {
    if (!(0, node_fs_1.existsSync)(dir))
        return null;
    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(dir, "manifest.json")))
        return dir;
    for (const name of (0, node_fs_1.readdirSync)(dir)) {
        const child = (0, node_path_1.join)(dir, name);
        try {
            if (!(0, node_fs_1.statSync)(child).isDirectory())
                continue;
        }
        catch {
            continue;
        }
        const found = findTweakRoot(child);
        if (found)
            return found;
    }
    return null;
}
function copyTweakSource(source, target) {
    (0, node_fs_1.cpSync)(source, target, {
        recursive: true,
        filter: (src) => !/(^|[/\\])(?:\.git|node_modules)(?:[/\\]|$)/.test(src),
    });
}
async function assertStoreTweakCleanForAutoUpdate(entry, target, work) {
    if (!(0, node_fs_1.existsSync)(target))
        return;
    const metadata = readStoreInstallMetadata(target);
    if (!metadata)
        return;
    if (metadata.repo !== entry.repo) {
        throw new StoreTweakModifiedError(entry.manifest.name);
    }
    const currentFiles = hashTweakSource(target);
    const baselineFiles = metadata.files ?? await fetchBaselineStoreTweakHashes(metadata, work);
    if (!sameFileHashes(currentFiles, baselineFiles)) {
        throw new StoreTweakModifiedError(entry.manifest.name);
    }
}
function readStoreInstallMetadata(target) {
    const metadataPath = (0, node_path_1.join)(target, ".codexpp-store.json");
    if (!(0, node_fs_1.existsSync)(metadataPath))
        return null;
    try {
        const parsed = JSON.parse((0, node_fs_1.readFileSync)(metadataPath, "utf8"));
        if (typeof parsed.repo !== "string" || typeof parsed.approvedCommitSha !== "string")
            return null;
        return {
            repo: parsed.repo,
            approvedCommitSha: parsed.approvedCommitSha,
            installedAt: typeof parsed.installedAt === "string" ? parsed.installedAt : "",
            storeIndexUrl: typeof parsed.storeIndexUrl === "string" ? parsed.storeIndexUrl : "",
            files: isHashRecord(parsed.files) ? parsed.files : undefined,
        };
    }
    catch {
        return null;
    }
}
async function fetchBaselineStoreTweakHashes(metadata, work) {
    const baselineDir = (0, node_path_1.join)(work, "baseline");
    const archive = (0, node_path_1.join)(work, "baseline.tar.gz");
    const res = await fetch(`https://codeload.github.com/${metadata.repo}/tar.gz/${metadata.approvedCommitSha}`, {
        headers: { "User-Agent": `codex-plusplus/${runtime_paths_1.CODEX_PLUSPLUS_VERSION}` },
        redirect: "follow",
    });
    if (!res.ok)
        throw new Error(`Could not verify local tweak changes before update: ${res.status}`);
    (0, node_fs_1.writeFileSync)(archive, Buffer.from(await res.arrayBuffer()));
    (0, node_fs_1.mkdirSync)(baselineDir, { recursive: true });
    extractTarArchive(archive, baselineDir);
    const source = findTweakRoot(baselineDir);
    if (!source)
        throw new Error("Could not verify local tweak changes before update: baseline manifest missing");
    return hashTweakSource(source);
}
function hashTweakSource(root) {
    const out = {};
    collectTweakFileHashes(root, root, out);
    return out;
}
function collectTweakFileHashes(root, dir, out) {
    for (const name of (0, node_fs_1.readdirSync)(dir).sort()) {
        if (name === ".git" || name === "node_modules" || name === ".codexpp-store.json")
            continue;
        const full = (0, node_path_1.join)(dir, name);
        const rel = (0, node_path_1.relative)(root, full).split("\\").join("/");
        const stat = (0, node_fs_1.statSync)(full);
        if (stat.isDirectory()) {
            collectTweakFileHashes(root, full, out);
            continue;
        }
        if (!stat.isFile())
            continue;
        out[rel] = (0, node_crypto_1.createHash)("sha256").update((0, node_fs_1.readFileSync)(full)).digest("hex");
    }
}
function sameFileHashes(a, b) {
    const ak = Object.keys(a).sort();
    const bk = Object.keys(b).sort();
    if (ak.length !== bk.length)
        return false;
    for (let i = 0; i < ak.length; i++) {
        const key = ak[i];
        if (key !== bk[i] || a[key] !== b[key])
            return false;
    }
    return true;
}
function isHashRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
    return Object.values(value).every((v) => typeof v === "string");
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
//# sourceMappingURL=store-install.js.map