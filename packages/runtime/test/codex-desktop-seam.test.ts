import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  APP_SERVER_INVOCATION_STATUS,
  DESKTOP_BUNDLED_APP_SERVER_SUPPORT,
  DESKTOP_LIVE_INTERCEPTION,
  DESKTOP_SPAWN_SEAM,
  PRODUCTION_CHILD_TRANSPORT_ENABLED,
  UPSTREAM_APP_SERVER_PROTOCOL,
  UPSTREAM_APP_SERVER_STDIO_ARGV,
  UPSTREAM_APP_SERVER_STDIO_ARGV_FIXED,
  appServerDiscoveryReport,
} from "../src/codex-app-server/discovery";
import {
  CodexDesktopSpawnProbe,
  classifySpawnCall,
  collectDesktopTrustedRoots,
} from "../src/codex-desktop-seam";
import type { SanitizedSpawnObservation, SpawnModule } from "../src/codex-desktop-seam";
import { trustedCodexSearchRoots } from "../src/codex-sessions/launcher";

const SECRET = "SECRET_TOKEN_DO_NOT_LOG";
const AUTH = "Bearer leaked-authorization";

function identityIo() {
  return { realpathSync: (path: string) => path };
}

function createSpawnModule(impl?: (...args: unknown[]) => unknown): {
  module: SpawnModule;
  calls: unknown[][];
  original: (...args: unknown[]) => unknown;
} {
  const calls: unknown[][] = [];
  const original = (...args: unknown[]) => {
    calls.push(args);
    return impl ? impl(...args) : { ok: true, args };
  };
  return { module: { spawn: original }, calls, original };
}

function makeProbe(opts: {
  enabled?: boolean;
  roots: readonly string[];
  platform?: NodeJS.Platform;
  spawn?: SpawnModule;
  log?: (observation: SanitizedSpawnObservation) => void;
  trustedRoots?: () => readonly string[];
  io?: { realpathSync: (path: string) => string };
}): CodexDesktopSpawnProbe {
  const spawnModule = opts.spawn ?? createSpawnModule().module;
  return new CodexDesktopSpawnProbe({
    spawnModule,
    env: opts.enabled === false ? {} : { CODEXPP_APP_SERVER_PROBE: "1" },
    trustedRoots: opts.trustedRoots ?? (() => opts.roots),
    platform: opts.platform ?? "linux",
    version: "1.1.4",
    now: () => "2026-08-17T00:00:00.000Z",
    io: opts.io ?? identityIo(),
    log: opts.log,
  });
}

test("discovery: upstream stdio argv proven, Desktop seam unverified, production blocked", () => {
  const report = appServerDiscoveryReport();
  assert.equal(UPSTREAM_APP_SERVER_PROTOCOL, "PROVEN");
  assert.equal(UPSTREAM_APP_SERVER_STDIO_ARGV, "PROVEN");
  assert.deepEqual([...UPSTREAM_APP_SERVER_STDIO_ARGV_FIXED], ["app-server", "--listen", "stdio://"]);
  assert.equal(DESKTOP_BUNDLED_APP_SERVER_SUPPORT, "UNVERIFIED");
  assert.equal(DESKTOP_SPAWN_SEAM, "UNVERIFIED");
  assert.equal(DESKTOP_LIVE_INTERCEPTION, "BLOCKED");
  assert.equal(APP_SERVER_INVOCATION_STATUS, "BLOCKED");
  assert.equal(PRODUCTION_CHILD_TRANSPORT_ENABLED, false);
  assert.equal(report.productionChildTransportEnabled, false);
  assert.equal(report.desktopSpawnSeam, "UNVERIFIED");
});

test("trusted Desktop roots agree with resolveTrustedCodexExecutable search roots", () => {
  const opts = {
    platform: "darwin" as const,
    resourcesPath: "/App/Contents/Resources",
    appPath: "/App",
  };
  assert.deepEqual(collectDesktopTrustedRoots(opts), trustedCodexSearchRoots(opts));
});

test("probe disabled: original spawn function untouched", () => {
  const { module, original } = createSpawnModule();
  const probe = makeProbe({ enabled: false, roots: ["/trusted"], spawn: module });
  probe.install();
  assert.equal(module.spawn, original);
  assert.equal(probe.getStatus().enabled, false);
  assert.equal(probe.getStatus().hookInstalled, false);
  const child = { id: 1 };
  module.spawn = () => child;
  const kept = module.spawn;
  probe.install();
  assert.equal(module.spawn, kept);
});

test("probe enabled: non-Codex spawn passes through unchanged", () => {
  const child = { name: "python" };
  const { module, calls, original } = createSpawnModule(() => child);
  const probe = makeProbe({ roots: ["/trusted"], spawn: module });
  probe.install();
  assert.notEqual(module.spawn, original);
  const env = { AUTHORIZATION: AUTH, CODEX_AUTH: SECRET };
  const result = (module.spawn as (...args: unknown[]) => unknown)(
    "/usr/bin/python",
    ["app-server", "--listen", "stdio://"],
    { env, cwd: "/home/user/.codex" },
  );
  assert.equal(result, child);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/usr/bin/python");
  assert.deepEqual(calls[0][1], ["app-server", "--listen", "stdio://"]);
  assert.equal((calls[0][2] as { env: unknown }).env, env);
  assert.equal(probe.getStatus().candidateObserved, false);
});

test("return identity: exact child object from original spawn is returned", () => {
  const child = { marker: "exact-child" };
  const { module } = createSpawnModule(() => child);
  const probe = makeProbe({ roots: ["/trusted"], spawn: module });
  probe.install();
  const result = (module.spawn as (...args: unknown[]) => unknown)(
    "/trusted/codex",
    ["app-server", "--listen", "stdio://"],
  );
  assert.equal(result, child);
});

test("trusted Codex + app-server + --listen stdio:// is a candidate", () => {
  const { module } = createSpawnModule();
  const probe = makeProbe({ roots: ["/opt/ChatGPT/resources"], spawn: module });
  probe.install();
  (module.spawn as (...args: unknown[]) => unknown)(
    "/opt/ChatGPT/resources/codex",
    ["app-server", "--listen", "stdio://"],
  );
  const status = probe.getStatus();
  assert.equal(status.candidateObserved, true);
  assert.equal(status.trustedExecutable, true);
  assert.equal(status.appServerArgsObserved, true);
  assert.equal(status.transportMode, "listen-stdio");
  assert.equal(status.observationCount, 1);
  assert.equal(probe.getDiagnostics()[0]?.relativeResourcePath, "codex");
});

test("trusted Codex + app-server + --stdio is a candidate", () => {
  const { module } = createSpawnModule();
  const probe = makeProbe({ roots: ["/opt/ChatGPT/resources"], spawn: module });
  probe.install();
  (module.spawn as (...args: unknown[]) => unknown)(
    "/opt/ChatGPT/resources/bin/codex",
    ["app-server", "--stdio"],
  );
  assert.equal(probe.getStatus().candidateObserved, true);
  assert.equal(probe.getStatus().transportMode, "stdio-flag");
});

test("Codex-looking executable outside trusted roots is not trusted", () => {
  const { module } = createSpawnModule();
  const probe = makeProbe({ roots: ["/opt/ChatGPT/resources"], spawn: module });
  probe.install();
  (module.spawn as (...args: unknown[]) => unknown)("/home/user/.local/bin/codex", [
    "app-server",
    "--stdio",
  ]);
  const status = probe.getStatus();
  assert.equal(status.trustedExecutable, false);
  assert.equal(status.candidateObserved, false);
  assert.equal(status.appServerArgsObserved, true);
});

test("arbitrary process containing app-server is not a candidate", () => {
  const { module } = createSpawnModule();
  const probe = makeProbe({ roots: ["/opt/ChatGPT/resources"], spawn: module });
  probe.install();
  (module.spawn as (...args: unknown[]) => unknown)("/usr/bin/node", [
    "app-server",
    "--listen",
    "stdio://",
  ]);
  assert.equal(probe.getStatus().candidateObserved, false);
  assert.equal(probe.getStatus().trustedExecutable, false);
});

test("app-server without stdio transport is not a proven Desktop stdio candidate", () => {
  const { module } = createSpawnModule();
  const probe = makeProbe({ roots: ["/opt/ChatGPT/resources"], spawn: module });
  probe.install();
  (module.spawn as (...args: unknown[]) => unknown)("/opt/ChatGPT/resources/codex", [
    "app-server",
    "--listen",
    "ws://127.0.0.1:9",
  ]);
  const status = probe.getStatus();
  assert.equal(status.appServerArgsObserved, true);
  assert.equal(status.trustedExecutable, true);
  assert.equal(status.candidateObserved, false);
  assert.equal(status.transportMode, null);
});

test("--config prefix before app-server still detects and does not log the value", () => {
  const logs: SanitizedSpawnObservation[] = [];
  const { module, calls } = createSpawnModule();
  const probe = makeProbe({
    roots: ["/opt/ChatGPT/resources"],
    spawn: module,
    log: (observation) => logs.push(observation),
  });
  probe.install();
  const argv = ["--config", `auth.json=${SECRET}`, "app-server", "--listen", "stdio://"];
  (module.spawn as (...args: unknown[]) => unknown)("/opt/ChatGPT/resources/codex", argv, {
    env: { AUTHORIZATION: AUTH },
  });
  assert.equal(probe.getStatus().candidateObserved, true);
  assert.deepEqual(calls[0][1], argv);
  const dumped = JSON.stringify({ logs, status: probe.getStatus(), diagnostics: probe.getDiagnostics() });
  assert.equal(dumped.includes(SECRET), false);
  assert.equal(dumped.includes("auth.json"), false);
  assert.equal(dumped.includes(AUTH), false);
  assert.equal(dumped.includes("AUTHORIZATION"), false);
});

test("repeated install does not double wrap", () => {
  let count = 0;
  const { module } = createSpawnModule(() => {
    count += 1;
    return { count };
  });
  const probe = makeProbe({ roots: ["/trusted"], spawn: module });
  probe.install();
  probe.install();
  probe.install();
  (module.spawn as (...args: unknown[]) => unknown)("/trusted/codex", ["app-server", "--stdio"]);
  assert.equal(count, 1);
  assert.equal(probe.getStatus().observationCount, 1);
});

test("Windows codex.exe casing and path behavior", () => {
  const { module } = createSpawnModule();
  const probe = makeProbe({
    roots: ["C:\\ChatGPT\\resources"],
    spawn: module,
    platform: "win32",
  });
  probe.install();
  (module.spawn as (...args: unknown[]) => unknown)("C:\\chatgpt\\RESOURCES\\Codex.EXE", [
    "app-server",
    "--listen",
    "stdio://",
  ]);
  assert.equal(probe.getStatus().candidateObserved, true);
  assert.equal(probe.getStatus().trustedExecutable, true);
  assert.equal(probe.getDiagnostics()[0]?.executableBasename.toLowerCase(), "codex.exe");
});

test("macOS and Linux resource path behavior", () => {
  const mac = createSpawnModule();
  const macProbe = makeProbe({
    roots: collectDesktopTrustedRoots({
      platform: "darwin",
      resourcesPath: "/Applications/ChatGPT.app/Contents/Resources",
      appPath: "/Applications/ChatGPT.app",
    }),
    spawn: mac.module,
    platform: "darwin",
  });
  macProbe.install();
  (mac.module.spawn as (...args: unknown[]) => unknown)(
    "/Applications/ChatGPT.app/Contents/Resources/codex",
    ["app-server", "--stdio"],
  );
  assert.equal(macProbe.getStatus().candidateObserved, true);

  const linux = createSpawnModule();
  const linuxProbe = makeProbe({
    roots: ["/opt/ChatGPT/resources"],
    spawn: linux.module,
    platform: "linux",
  });
  linuxProbe.install();
  (linux.module.spawn as (...args: unknown[]) => unknown)("/opt/ChatGPT/resources/codex", [
    "app-server",
    "--listen",
    "stdio://",
  ]);
  assert.equal(linuxProbe.getStatus().candidateObserved, true);
});

test("malformed argv passes through without crashing", () => {
  const child = { malformed: true };
  const { module, calls } = createSpawnModule(() => child);
  const probe = makeProbe({ roots: ["/trusted"], spawn: module });
  probe.install();
  const spawn = module.spawn as (...args: unknown[]) => unknown;
  assert.equal(spawn(undefined, ["app-server", "--stdio"]), child);
  assert.equal(spawn("/trusted/codex", { shell: true, env: { TOKEN: SECRET } }), child);
  assert.equal(spawn("/trusted/codex", [1, { x: SECRET }] as unknown[]), child);
  assert.equal(spawn("/trusted/codex"), child);
  assert.equal(calls.length, 4);
  assert.equal(probe.getStatus().candidateObserved, false);
  const dumped = JSON.stringify(probe.getDiagnostics());
  assert.equal(dumped.includes(SECRET), false);
});

test("internal classifier throw still executes original spawn", () => {
  const child = { survived: true };
  const { module, calls } = createSpawnModule(() => child);
  const probe = makeProbe({
    roots: ["/trusted"],
    spawn: module,
    trustedRoots: () => {
      throw new Error(`boom ${SECRET}`);
    },
  });
  probe.install();
  const result = (module.spawn as (...args: unknown[]) => unknown)("/trusted/codex", [
    "app-server",
    "--stdio",
  ]);
  assert.equal(result, child);
  assert.equal(calls.length, 1);
});

test("diagnostics contain no env or argv secret values", () => {
  const { module } = createSpawnModule();
  const probe = makeProbe({ roots: ["/trusted"], spawn: module });
  probe.install();
  (module.spawn as (...args: unknown[]) => unknown)(
    "/trusted/codex",
    ["--config", SECRET, "app-server", "--listen", "stdio://", AUTH],
    { env: { AUTHORIZATION: AUTH, OPENAI_API_KEY: SECRET }, cwd: `/Users/me/.codex/${SECRET}` },
  );
  const dumped = JSON.stringify({ diagnostics: probe.getDiagnostics(), status: probe.getStatus() });
  assert.equal(dumped.includes(SECRET), false);
  assert.equal(dumped.includes(AUTH), false);
  assert.equal(dumped.includes("OPENAI_API_KEY"), false);
  assert.equal(dumped.includes("AUTHORIZATION"), false);
  assert.equal(dumped.includes(".codex"), false);
  assert.equal(probe.getStatus().candidateObserved, true);
});

test("symlink that escapes trusted roots is not trusted but still pass-through", () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-seam-root-"));
  const outside = mkdtempSync(join(tmpdir(), "codexpp-seam-out-"));
  try {
    writeFileSync(join(outside, "codex"), "");
    const link = join(root, "codex");
    try {
      symlinkSync(join(outside, "codex"), link);
    } catch {
      return;
    }
    const child = { via: "symlink" };
    const { module, calls } = createSpawnModule(() => child);
    const probe = new CodexDesktopSpawnProbe({
      spawnModule: module,
      env: { CODEXPP_APP_SERVER_PROBE: "1" },
      trustedRoots: () => [root],
      platform: "linux",
      io: { realpathSync },
    });
    probe.install();
    const result = (module.spawn as (...args: unknown[]) => unknown)(link, ["app-server", "--stdio"]);
    assert.equal(result, child);
    assert.equal(calls.length, 1);
    assert.equal(probe.getStatus().trustedExecutable, false);
    assert.equal(probe.getStatus().candidateObserved, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("basename alone is not sufficient even for a file named codex", () => {
  const classified = classifySpawnCall({
    callArgs: ["codex", ["app-server", "--stdio"]],
    trustedRoots: ["/opt/ChatGPT/resources"],
    platform: "linux",
    io: identityIo(),
  });
  assert.equal(classified.candidate, false);
  assert.equal(classified.trustedExecutable, false);
});
