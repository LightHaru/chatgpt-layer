import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

export const WINDOWS_CODEX_CONTEXT_MENU_KEYS = [
  "HKCU:\\Software\\Classes\\Directory\\shell\\OpenProjectInCodex",
  "HKCU:\\Software\\Classes\\Directory\\Background\\shell\\OpenProjectInCodex",
];

export const WINDOWS_WATCHER_TASK_NAMES = [
  "codex-plusplus-watcher",
  "codex-plusplus-watcher-interval",
  "codex-plusplus-watcher-hourly",
  "codex-plusplus-watcher-daily",
];

export function cleanupWindowsManagedArtifacts(): void {
  if (platform() !== "win32") return;

  const script = buildWindowsManagedCleanupScript({
    localAppData: process.env.LOCALAPPDATA,
    appData: process.env.APPDATA,
    home: homedir(),
  });

  try {
    execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
      { stdio: "ignore" },
    );
  } catch {
    // Best-effort cleanup. Uninstall should still restore Codex even if a
    // shortcut or registry key is locked by Windows Explorer.
  }
}

export function buildWindowsManagedCleanupScript(input: {
  localAppData?: string;
  appData?: string;
  home: string;
}): string {
  const cleanupPaths = [
    input.localAppData ? join(input.localAppData, "Microsoft", "WindowsApps", "codex-plusplus-codex.cmd") : null,
    input.localAppData ? join(input.localAppData, "codex-plusplus", "store-apps") : null,
    input.appData ? join(input.appData, "codex-plusplus", "bin", "watcher.cmd") : null,
    input.appData ? join(input.appData, "Microsoft", "Windows", "Start Menu", "Programs", "Codex++.lnk") : null,
    join(input.home, "Desktop", "Codex++.lnk"),
  ].filter((path): path is string => path !== null);

  const emptyDirs = [
    input.appData ? join(input.appData, "codex-plusplus", "bin") : null,
  ].filter((path): path is string => path !== null);

  return [
    "$ErrorActionPreference = 'SilentlyContinue'",
    "$watcherTasks = @(",
    ...WINDOWS_WATCHER_TASK_NAMES.map((name) => `  '${escapePowerShellSingleQuotedString(name)}'`),
    ")",
    "foreach ($taskName in $watcherTasks) {",
    "  Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue | ForEach-Object {",
    "    try { Stop-ScheduledTask -InputObject $_ -ErrorAction SilentlyContinue } catch {}",
    "    try { Disable-ScheduledTask -InputObject $_ -ErrorAction SilentlyContinue } catch {}",
    "    try { Unregister-ScheduledTask -InputObject $_ -Confirm:$false -ErrorAction SilentlyContinue } catch {}",
    "  }",
    "}",
    "$currentPid = $PID",
    "Get-CimInstance Win32_Process | Where-Object {",
    "  $_.ProcessId -ne $currentPid -and $_.CommandLine -and",
    "  $_.CommandLine.ToString().ToLowerInvariant().Contains('codex-plusplus') -and",
    "  ($_.CommandLine.ToString().ToLowerInvariant().Contains('watcher.cmd') -or",
    "    $_.CommandLine.ToString().ToLowerInvariant().Contains('--watcher') -or",
    "    $_.CommandLine.ToString().ToLowerInvariant().Contains('codex-plusplus-watcher'))",
    "} | ForEach-Object {",
    "  try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {}",
    "}",
    "$managedPattern = '\\codex-plusplus\\store-apps\\'",
    "$contextKeys = @(",
    ...WINDOWS_CODEX_CONTEXT_MENU_KEYS.map((key) => `  '${escapePowerShellSingleQuotedString(key)}'`),
    ")",
    "foreach ($key in $contextKeys) {",
    "  $commandKey = Join-Path $key 'command'",
    "  $command = $null",
    "  if (Test-Path -LiteralPath $commandKey) {",
    "    try { $command = (Get-Item -LiteralPath $commandKey).GetValue('') } catch {}",
    "  }",
    "  if ($command -and $command.ToString().ToLowerInvariant().Contains($managedPattern)) {",
    "    Remove-Item -LiteralPath $key -Recurse -Force",
    "  }",
    "}",
    "$cleanupPaths = @(",
    ...cleanupPaths.map((path) => `  '${escapePowerShellSingleQuotedString(path)}'`),
    ")",
    "foreach ($path in $cleanupPaths) {",
    "  if (Test-Path -LiteralPath $path) {",
    "    Remove-Item -LiteralPath $path -Recurse -Force",
    "  }",
    "}",
    "$emptyDirs = @(",
    ...emptyDirs.map((path) => `  '${escapePowerShellSingleQuotedString(path)}'`),
    ")",
    "foreach ($path in $emptyDirs) {",
    "  if ((Test-Path -LiteralPath $path) -and -not (Get-ChildItem -LiteralPath $path -Force | Select-Object -First 1)) {",
    "    Remove-Item -LiteralPath $path -Force",
    "  }",
    "}",
  ].join("\n");
}

function escapePowerShellSingleQuotedString(value: string): string {
  return value.replace(/'/g, "''");
}
