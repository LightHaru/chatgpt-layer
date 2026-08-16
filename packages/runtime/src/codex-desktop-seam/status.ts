import type { DesktopSpawnSeamStatus, DesktopStdioTransportMode, DesktopSpawnApi } from "./types";

export function emptyDesktopSpawnSeamStatus(): DesktopSpawnSeamStatus {
  return {
    enabled: false,
    hookInstalled: false,
    spawnApi: null,
    candidateObserved: false,
    trustedExecutable: false,
    appServerArgsObserved: false,
    transportMode: null,
    observationCount: 0,
    hookInstallError: null,
  };
}

export function recordObservation(
  status: DesktopSpawnSeamStatus,
  update: {
    trustedExecutable: boolean;
    appServerSubcommand: boolean;
    candidate: boolean;
    transportMode: DesktopStdioTransportMode | null;
    spawnApi: DesktopSpawnApi;
  },
): void {
  status.observationCount += 1;
  status.spawnApi = update.spawnApi;
  if (update.trustedExecutable) status.trustedExecutable = true;
  if (update.appServerSubcommand) status.appServerArgsObserved = true;
  if (update.candidate) {
    status.candidateObserved = true;
    if (update.transportMode) status.transportMode = update.transportMode;
  }
}
