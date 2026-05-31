import kleur from "kleur";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join, sep } from "node:path";
import { locateCodex, type CodexInstall } from "../platform.js";
import { userPaths, type UserPaths } from "../paths.js";

export interface DebugOpts {
  app?: string;
}

type RuntimeType = "electron" | "owl" | "unknown";
type OpenStatus = "open" | "inactive" | "background" | "closed" | "unknown";

export interface DebugReport {
  codex: CodexInstall;
  runtime: RuntimeReport;
  codexDataPaths: DataPath[];
  codexPlusPlusPaths: DataPath[];
  open: OpenReport;
}

export interface RuntimeReport {
  type: RuntimeType;
  evidence: string[];
}

export interface DataPath {
  label: string;
  path: string;
  exists: boolean;
}

export interface OpenReport {
  status: OpenStatus;
  pid: number | null;
  relatedPids: number[];
  openedAt: string | null;
  openedAtRaw: string | null;
  detail: string | null;
}

interface ProcessInfo {
  pid: number;
  ppid: number | null;
  startedAtRaw: string | null;
  startedAt: string | null;
  command: string;
}

type MacProcessUiState = "frontmost" | "visible" | "hidden" | "not-found" | "unknown";

export async function debug(opts: DebugOpts = {}): Promise<void> {
  const report = collectDebugReport(opts);
  printDebugReport(report);
}

export function collectDebugReport(opts: DebugOpts = {}): DebugReport {
  const paths = userPaths();
  const codex = locateCodex(opts.app);
  return {
    codex,
    runtime: detectRuntime(codex),
    codexDataPaths: codexDataPaths(codex),
    codexPlusPlusPaths: codexPlusPlusPaths(paths),
    open: getOpenReport(codex),
  };
}

export function detectRuntime(codex: CodexInstall): RuntimeReport {
  const evidence: string[] = [];

  if (codex.platform === "darwin") {
    const owlFramework = join(codex.appRoot, "Contents", "Frameworks", "Codex Framework.framework");
    const owlExecutable = join(codex.resourcesDir, "codex");
    const electronFramework = join(
      codex.appRoot,
      "Contents",
      "Frameworks",
      "Electron Framework.framework",
    );

    if (existsSync(owlFramework)) evidence.push(`found ${owlFramework}`);
    if (existsSync(owlExecutable)) evidence.push(`found ${owlExecutable}`);
    if (existsSync(electronFramework)) evidence.push(`found ${electronFramework}`);
    if (existsSync(codex.asarPath)) evidence.push(`found ${codex.asarPath}`);

    if (existsSync(owlFramework)) return { type: "owl", evidence };
    if (existsSync(electronFramework) || existsSync(codex.asarPath)) {
      return { type: "electron", evidence };
    }
    return { type: "unknown", evidence };
  }

  if (existsSync(codex.asarPath)) evidence.push(`found ${codex.asarPath}`);
  if (existsSync(codex.electronBinary)) evidence.push(`found ${codex.electronBinary}`);
  return {
    type: existsSync(codex.asarPath) ? "electron" : "unknown",
    evidence,
  };
}

export function codexDataPaths(codex: Pick<CodexInstall, "appName" | "bundleId" | "platform">): DataPath[] {
  const home = homedir();
  const appName = codex.appName || "Codex";
  const bundleId = codex.bundleId ?? "com.openai.codex";

  if (codex.platform === "darwin") {
    return existingAware([
      ["Application Support", join(home, "Library", "Application Support", appName)],
      ["Application Support (bundle id)", join(home, "Library", "Application Support", bundleId)],
      ["Caches", join(home, "Library", "Caches", bundleId)],
      ["Logs", join(home, "Library", "Logs", appName)],
      ["Saved State", join(home, "Library", "Saved Application State", `${bundleId}.savedState`)],
    ]);
  }

  if (codex.platform === "win32") {
    const roaming = process.env.APPDATA ?? join(home, "AppData", "Roaming");
    const local = process.env.LOCALAPPDATA ?? join(home, "AppData", "Local");
    return existingAware([
      ["Roaming data", join(roaming, appName)],
      ["Local data", join(local, appName)],
      ["Local cache", join(local, appName, "Cache")],
      ["Codex++ Store mirror", join(local, "codex-plusplus", "store-apps")],
    ]);
  }

  const configHome = process.env.XDG_CONFIG_HOME ?? join(home, ".config");
  const dataHome = process.env.XDG_DATA_HOME ?? join(home, ".local", "share");
  const cacheHome = process.env.XDG_CACHE_HOME ?? join(home, ".cache");
  const linuxName = appName.toLowerCase().replace(/\s+/g, "-");
  return existingAware([
    ["Config", join(configHome, linuxName)],
    ["Data", join(dataHome, linuxName)],
    ["Cache", join(cacheHome, linuxName)],
  ]);
}

export function codexPlusPlusPaths(paths: UserPaths = userPaths()): DataPath[] {
  return existingAware([
    ["Root", paths.root],
    ["Runtime", paths.runtime],
    ["Tweaks", paths.tweaks],
    ["Tweak data", join(paths.root, "tweak-data")],
    ["Config", paths.configFile],
    ["State", paths.stateFile],
    ["Update mode", paths.updateModeFile],
    ["Self-update state", paths.selfUpdateStateFile],
    ["Backup", paths.backup],
    ["Log", paths.logDir],
    ["Bin", paths.binDir],
  ]);
}

function existingAware(entries: [label: string, path: string][]): DataPath[] {
  return entries.map(([label, path]) => ({ label, path, exists: existsSync(path) }));
}

export function getOpenReport(codex: CodexInstall): OpenReport {
  const processes = listProcesses();
  const related = relatedCodexProcesses(codex, processes);
  const main = mainCodexProcesses(codex, related);
  const primary = earliestProcess(main) ?? earliestProcess(related) ?? null;

  if (!primary) {
    return {
      status: "closed",
      pid: null,
      relatedPids: [],
      openedAt: null,
      openedAtRaw: null,
      detail: "No Codex processes found for the detected install path.",
    };
  }

  if (main.length === 0) {
    return {
      status: "background",
      pid: primary.pid,
      relatedPids: related.map((p) => p.pid),
      openedAt: primary.startedAt,
      openedAtRaw: primary.startedAtRaw,
      detail: "Only helper/background processes were found.",
    };
  }

  if (codex.platform === "darwin") {
    const uiState = macProcessUiState(primary.pid);
    if (uiState === "frontmost") {
      return openReport("open", primary, related, "Main Codex process is frontmost.");
    }
    if (uiState === "hidden") {
      return openReport("background", primary, related, "Main Codex process is running but hidden.");
    }
    if (uiState === "visible") {
      return openReport("inactive", primary, related, "Main Codex process is running but not frontmost.");
    }
    return openReport("inactive", primary, related, "Main Codex process is running; foreground state was not accessible.");
  }

  return openReport("inactive", primary, related, "Main Codex process is running.");
}

function openReport(status: OpenStatus, primary: ProcessInfo, related: ProcessInfo[], detail: string): OpenReport {
  return {
    status,
    pid: primary.pid,
    relatedPids: related.map((p) => p.pid),
    openedAt: primary.startedAt,
    openedAtRaw: primary.startedAtRaw,
    detail,
  };
}

export function parsePsOutput(output: string): ProcessInfo[] {
  return output
    .split(/\r?\n/)
    .map((line) => parsePsLine(line))
    .filter((p): p is ProcessInfo => p !== null);
}

function parsePsLine(line: string): ProcessInfo | null {
  const match = /^\s*(\d+)\s+(\d+|-)\s+(.{24})\s+(.+?)\s*$/.exec(line);
  if (!match) return null;
  const pid = Number(match[1]);
  const ppid = match[2] === "-" ? null : Number(match[2]);
  const startedAtRaw = match[3].trim();
  return {
    pid,
    ppid,
    startedAtRaw,
    startedAt: parsePsStartTime(startedAtRaw),
    command: match[4],
  };
}

function parsePsStartTime(value: string): string | null {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function listProcesses(): ProcessInfo[] {
  if (platform() === "win32") return listWindowsProcesses();
  try {
    const out = execFileSync("ps", ["-axo", "pid=,ppid=,lstart=,args="], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return parsePsOutput(out);
  } catch {
    return [];
  }
}

function listWindowsProcesses(): ProcessInfo[] {
  try {
    const out = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CreationDate,ExecutablePath | ConvertTo-Json -Compress",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 10_000 },
    ).trim();
    if (!out) return [];
    const rows = JSON.parse(out) as unknown;
    const list = Array.isArray(rows) ? rows : [rows];
    return list
      .map((row) => {
        const item = row as {
          ProcessId?: unknown;
          ParentProcessId?: unknown;
          CreationDate?: unknown;
          ExecutablePath?: unknown;
        };
        if (typeof item.ProcessId !== "number") return null;
        const startedAt = typeof item.CreationDate === "string" ? parseWindowsCimDate(item.CreationDate) : null;
        return {
          pid: item.ProcessId,
          ppid: typeof item.ParentProcessId === "number" ? item.ParentProcessId : null,
          startedAt,
          startedAtRaw: typeof item.CreationDate === "string" ? item.CreationDate : null,
          command: typeof item.ExecutablePath === "string" ? item.ExecutablePath : "",
        } satisfies ProcessInfo;
      })
      .filter((p): p is ProcessInfo => p !== null && p.command.length > 0);
  } catch {
    return [];
  }
}

function parseWindowsCimDate(value: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\.(\d+)([+-]\d+)?$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, micros] = match;
  const ms = Number(micros.slice(0, 3).padEnd(3, "0"));
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      ms,
    ),
  ).toISOString();
}

function relatedCodexProcesses(codex: CodexInstall, processes: ProcessInfo[]): ProcessInfo[] {
  const appRoot = normalizePath(codex.appRoot);
  const executable = normalizePath(codex.executable);
  const appRootPrefix = appRoot.endsWith(sep) ? appRoot : `${appRoot}${sep}`;

  return processes.filter((p) => {
    const command = normalizePath(p.command);
    return command === executable || command.startsWith(appRootPrefix);
  });
}

function mainCodexProcesses(codex: CodexInstall, processes: ProcessInfo[]): ProcessInfo[] {
  const executable = normalizePath(codex.executable);
  return processes.filter((p) => {
    const command = normalizePath(p.command);
    return command === executable || command.startsWith(`${executable} `);
  });
}

function earliestProcess(processes: ProcessInfo[]): ProcessInfo | null {
  return [...processes].sort((a, b) => {
    const at = a.startedAt ? Date.parse(a.startedAt) : Number.POSITIVE_INFINITY;
    const bt = b.startedAt ? Date.parse(b.startedAt) : Number.POSITIVE_INFINITY;
    if (at !== bt) return at - bt;
    return a.pid - b.pid;
  })[0] ?? null;
}

function normalizePath(path: string): string {
  return platform() === "win32" ? path.replace(/\//g, "\\").toLowerCase() : path;
}

function macProcessUiState(pid: number): MacProcessUiState {
  try {
    const script = [
      'tell application "System Events"',
      `set matches to every application process whose unix id is ${pid}`,
      "if (count of matches) is 0 then return \"not-found\"",
      "set proc to item 1 of matches",
      "if frontmost of proc then return \"frontmost\"",
      "if visible of proc then return \"visible\"",
      "return \"hidden\"",
      "end tell",
    ].join("\n");
    const out = execFileSync("osascript", ["-e", script], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3_000,
    }).trim();
    if (out === "frontmost" || out === "visible" || out === "hidden" || out === "not-found") {
      return out;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

function printDebugReport(report: DebugReport): void {
  console.log(kleur.bold("codex-plusplus debug"));
  console.log();

  console.log(kleur.bold("codex app"));
  console.log(`  install path: ${report.codex.appRoot}`);
  console.log(`  executable:   ${report.codex.executable}`);
  console.log(`  resources:    ${report.codex.resourcesDir}`);
  console.log(`  app.asar:     ${report.codex.asarPath}`);
  if (report.codex.metaPath) console.log(`  metadata:     ${report.codex.metaPath}`);
  console.log(`  app name:     ${report.codex.appName}`);
  console.log(`  channel:      ${report.codex.channel}`);
  if (report.codex.bundleId) console.log(`  bundle id:    ${report.codex.bundleId}`);
  console.log();

  console.log(kleur.bold("runtime"));
  console.log(`  type:         ${runtimeTypeLabel(report.runtime.type)}`);
  for (const item of report.runtime.evidence) {
    console.log(`  evidence:     ${item}`);
  }
  console.log();

  console.log(kleur.bold("open state"));
  console.log(`  status:       ${openStatusLabel(report.open.status)}`);
  console.log(`  pid:          ${report.open.pid ?? "(none)"}`);
  console.log(`  related pids: ${report.open.relatedPids.length ? report.open.relatedPids.join(", ") : "(none)"}`);
  console.log(`  opened at:    ${report.open.openedAt ?? report.open.openedAtRaw ?? "(unavailable)"}`);
  if (report.open.detail) console.log(`  detail:       ${report.open.detail}`);
  console.log();

  printDataPaths("codex data paths", report.codexDataPaths);
  console.log();
  printDataPaths("codex-plusplus data paths", report.codexPlusPlusPaths);
}

function printDataPaths(title: string, paths: DataPath[]): void {
  console.log(kleur.bold(title));
  for (const path of paths) {
    console.log(`  ${path.label.padEnd(31)} ${path.exists ? kleur.green("exists") : kleur.dim("missing")}  ${path.path}`);
  }
}

function runtimeTypeLabel(type: RuntimeType): string {
  if (type === "electron") return kleur.green("electron");
  if (type === "owl") return kleur.cyan("owl");
  return kleur.yellow("unknown");
}

function openStatusLabel(status: OpenStatus): string {
  if (status === "open") return kleur.green(status);
  if (status === "inactive") return kleur.yellow(status);
  if (status === "background") return kleur.yellow(status);
  if (status === "closed") return kleur.dim(status);
  return kleur.yellow(status);
}
