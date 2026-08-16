"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TWEAK_STORE_REVIEW_ISSUE_URL = exports.DEFAULT_TWEAK_STORE_INDEX_URL = exports.PINNED_TWEAK_STORE_INDEX_SHA256 = exports.PINNED_TWEAK_STORE_INDEX_COMMIT = void 0;
exports.normalizeGitHubRepo = normalizeGitHubRepo;
exports.normalizeStoreRegistry = normalizeStoreRegistry;
exports.shuffleStoreEntries = shuffleStoreEntries;
exports.normalizeStoreEntry = normalizeStoreEntry;
exports.storeArchiveUrl = storeArchiveUrl;
exports.buildTweakPublishIssueUrl = buildTweakPublishIssueUrl;
exports.isFullCommitSha = isFullCommitSha;
exports.resolveTweakStoreIndexUrl = resolveTweakStoreIndexUrl;
exports.assertStoreInstallPin = assertStoreInstallPin;
exports.shortCommitSha = shortCommitSha;
exports.listedPinLabel = listedPinLabel;
/** Commit of store/index.json reviewed into this runtime. Not floating main. */
exports.PINNED_TWEAK_STORE_INDEX_COMMIT = "7a0e95b161de5480261f17bbf84004d9be90dc6e";
/** SHA-256 of store/index.json at PINNED_TWEAK_STORE_INDEX_COMMIT. */
exports.PINNED_TWEAK_STORE_INDEX_SHA256 = "378e88cc366ef6d50816a27838af146c34fef122c6bfee3ba03c9549b862d063";
exports.DEFAULT_TWEAK_STORE_INDEX_URL = `https://raw.githubusercontent.com/LightHaru/chatgpt-layer/${exports.PINNED_TWEAK_STORE_INDEX_COMMIT}/store/index.json`;
exports.TWEAK_STORE_REVIEW_ISSUE_URL = "https://github.com/LightHaru/chatgpt-layer/issues/new";
const GITHUB_REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const FULL_SHA_RE = /^[a-f0-9]{40}$/i;
function normalizeGitHubRepo(input) {
    const raw = input.trim();
    if (!raw)
        throw new Error("GitHub repo is required");
    const ssh = /^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/i.exec(raw);
    if (ssh)
        return normalizeRepoPart(ssh[1]);
    if (/^https?:\/\//i.test(raw)) {
        const url = new URL(raw);
        if (url.hostname !== "github.com")
            throw new Error("Only github.com repositories are supported");
        const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
        if (parts.length < 2)
            throw new Error("GitHub repo URL must include owner and repository");
        return normalizeRepoPart(`${parts[0]}/${parts[1]}`);
    }
    return normalizeRepoPart(raw);
}
function normalizeStoreRegistry(input) {
    const registry = input;
    if (!registry || registry.schemaVersion !== 1 || !Array.isArray(registry.entries)) {
        throw new Error("Unsupported tweak store registry");
    }
    const entries = registry.entries.map(normalizeStoreEntry);
    entries.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
    return {
        schemaVersion: 1,
        generatedAt: typeof registry.generatedAt === "string" ? registry.generatedAt : undefined,
        entries,
    };
}
function shuffleStoreEntries(entries, randomIndex = (exclusiveMax) => Math.floor(Math.random() * exclusiveMax)) {
    const shuffled = [...entries];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = randomIndex(i + 1);
        if (!Number.isInteger(j) || j < 0 || j > i) {
            throw new Error(`shuffle randomIndex returned ${j}; expected an integer from 0 to ${i}`);
        }
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
function normalizeStoreEntry(input) {
    const entry = input;
    if (!entry || typeof entry !== "object")
        throw new Error("Invalid tweak store entry");
    const repo = normalizeGitHubRepo(String(entry.repo ?? entry.manifest?.githubRepo ?? ""));
    const manifest = entry.manifest;
    if (!manifest?.id || !manifest.name || !manifest.version) {
        throw new Error(`Store entry for ${repo} is missing manifest fields`);
    }
    if (normalizeGitHubRepo(manifest.githubRepo) !== repo) {
        throw new Error(`Store entry ${manifest.id} repo does not match manifest githubRepo`);
    }
    if (!isFullCommitSha(String(entry.approvedCommitSha ?? ""))) {
        throw new Error(`Store entry ${manifest.id} must pin a full approved commit SHA`);
    }
    return {
        id: manifest.id,
        manifest,
        repo,
        approvedCommitSha: String(entry.approvedCommitSha),
        approvedAt: typeof entry.approvedAt === "string" ? entry.approvedAt : "",
        approvedBy: typeof entry.approvedBy === "string" ? entry.approvedBy : "",
        platforms: normalizeStorePlatforms(entry.platforms),
        releaseUrl: optionalGithubUrl(entry.releaseUrl),
        reviewUrl: optionalGithubUrl(entry.reviewUrl),
    };
}
function storeArchiveUrl(entry) {
    if (!isFullCommitSha(entry.approvedCommitSha)) {
        throw new Error(`Store entry ${entry.id} is not pinned to a full commit SHA`);
    }
    return `https://codeload.github.com/${entry.repo}/tar.gz/${entry.approvedCommitSha}`;
}
function buildTweakPublishIssueUrl(submission) {
    const repo = normalizeGitHubRepo(submission.repo);
    if (!isFullCommitSha(submission.commitSha)) {
        throw new Error("Submission must include the full commit SHA to review");
    }
    const title = `Tweak store review: ${repo}`;
    const body = [
        "## Tweak repo",
        `https://github.com/${repo}`,
        "",
        "## Commit to review",
        submission.commitSha,
        submission.commitUrl,
        "",
        "Do not approve a different commit. If the author pushes changes, ask them to resubmit.",
        "",
        "## Manifest",
        `- id: ${submission.manifest?.id ?? "(not detected)"}`,
        `- name: ${submission.manifest?.name ?? "(not detected)"}`,
        `- version: ${submission.manifest?.version ?? "(not detected)"}`,
        `- description: ${submission.manifest?.description ?? "(not detected)"}`,
        `- iconUrl: ${submission.manifest?.iconUrl ?? "(not detected)"}`,
        "",
        "## Admin checklist",
        "- [ ] manifest.json is valid",
        "- [ ] manifest.iconUrl is usable as the store icon",
        "- [ ] source was reviewed at the exact commit above",
        "- [ ] `store/index.json` entry pins `approvedCommitSha` to the exact commit above",
    ].join("\n");
    const url = new URL(exports.TWEAK_STORE_REVIEW_ISSUE_URL);
    url.searchParams.set("template", "tweak-store-review.md");
    url.searchParams.set("title", title);
    url.searchParams.set("body", body);
    return url.toString();
}
function isFullCommitSha(value) {
    return FULL_SHA_RE.test(value);
}
function normalizeRepoPart(value) {
    const repo = value.trim().replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "");
    if (!GITHUB_REPO_RE.test(repo))
        throw new Error("GitHub repo must be in owner/repo form");
    return repo;
}
function normalizeStorePlatforms(input) {
    if (input === undefined)
        return undefined;
    if (!Array.isArray(input))
        throw new Error("Store entry platforms must be an array");
    const allowed = new Set(["darwin", "win32", "linux"]);
    const platforms = Array.from(new Set(input.map((value) => {
        if (typeof value !== "string" || !allowed.has(value)) {
            throw new Error(`Unsupported store platform: ${String(value)}`);
        }
        return value;
    })));
    return platforms.length > 0 ? platforms : undefined;
}
function optionalGithubUrl(value) {
    if (typeof value !== "string" || !value.trim())
        return undefined;
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "github.com")
        return undefined;
    return url.toString();
}
function resolveTweakStoreIndexUrl(env = process.env) {
    const override = env.CODEX_PLUSPLUS_STORE_INDEX_URL?.trim();
    if (override) {
        if (env.CODEX_PLUSPLUS_ALLOW_STORE_INDEX_OVERRIDE !== "1") {
            throw new Error("CODEX_PLUSPLUS_STORE_INDEX_URL override requires CODEX_PLUSPLUS_ALLOW_STORE_INDEX_OVERRIDE=1");
        }
        return override;
    }
    return exports.DEFAULT_TWEAK_STORE_INDEX_URL;
}
function assertStoreInstallPin(entry, commitSha) {
    if (entry.approvedCommitSha.toLowerCase() !== commitSha.toLowerCase()) {
        throw new Error(`Refusing to install ${entry.id} at ${commitSha}; store pin is ${entry.approvedCommitSha}`);
    }
}
function shortCommitSha(sha) {
    return sha.slice(0, 7);
}
function listedPinLabel(sha) {
    return `Listed · pinned ${shortCommitSha(sha)}`;
}
//# sourceMappingURL=tweak-store.js.map