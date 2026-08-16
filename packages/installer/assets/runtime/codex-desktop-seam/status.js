"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyDesktopSpawnSeamStatus = emptyDesktopSpawnSeamStatus;
exports.recordObservation = recordObservation;
function emptyDesktopSpawnSeamStatus() {
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
function recordObservation(status, update) {
    status.observationCount += 1;
    status.spawnApi = update.spawnApi;
    if (update.trustedExecutable)
        status.trustedExecutable = true;
    if (update.appServerSubcommand)
        status.appServerArgsObserved = true;
    if (update.candidate) {
        status.candidateObserved = true;
        if (update.transportMode)
            status.transportMode = update.transportMode;
    }
}
//# sourceMappingURL=status.js.map