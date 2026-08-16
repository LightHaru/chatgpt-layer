"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readState = readState;
exports.writeState = writeState;
exports.isCodexPlusPlusAutoUpdateEnabled = isCodexPlusPlusAutoUpdateEnabled;
exports.setCodexPlusPlusAutoUpdate = setCodexPlusPlusAutoUpdate;
exports.setCodexPlusPlusUpdateConfig = setCodexPlusPlusUpdateConfig;
exports.isCodexPlusPlusSafeModeEnabled = isCodexPlusPlusSafeModeEnabled;
exports.isTweakEnabled = isTweakEnabled;
exports.setTweakEnabled = setTweakEnabled;
exports.readInstallerState = readInstallerState;
exports.readSelfUpdateState = readSelfUpdateState;
exports.writeSelfUpdateState = writeSelfUpdateState;
exports.cleanOptionalString = cleanOptionalString;
const node_fs_1 = require("node:fs");
const ipc_guard_1 = require("./ipc-guard");
const runtime_paths_1 = require("./runtime-paths");
function readState() {
    try {
        return JSON.parse((0, node_fs_1.readFileSync)(runtime_paths_1.CONFIG_FILE, "utf8"));
    }
    catch {
        return {};
    }
}
function writeState(s) {
    try {
        (0, node_fs_1.writeFileSync)(runtime_paths_1.CONFIG_FILE, JSON.stringify(s, null, 2));
    }
    catch (e) {
        (0, runtime_paths_1.log)("warn", "writeState failed:", String(e.message));
    }
}
function isCodexPlusPlusAutoUpdateEnabled() {
    return (0, ipc_guard_1.isLayerAutoUpdateEnabled)(readState().codexPlusPlus?.autoUpdate);
}
function setCodexPlusPlusAutoUpdate(enabled) {
    const s = readState();
    s.codexPlusPlus ??= {};
    s.codexPlusPlus.autoUpdate = enabled;
    writeState(s);
}
function setCodexPlusPlusUpdateConfig(config) {
    const s = readState();
    s.codexPlusPlus ??= {};
    if (config.updateChannel)
        s.codexPlusPlus.updateChannel = config.updateChannel;
    if ("updateRepo" in config)
        s.codexPlusPlus.updateRepo = cleanOptionalString(config.updateRepo);
    if ("updateRef" in config)
        s.codexPlusPlus.updateRef = cleanOptionalString(config.updateRef);
    writeState(s);
}
function isCodexPlusPlusSafeModeEnabled() {
    return readState().codexPlusPlus?.safeMode === true;
}
function isTweakEnabled(id) {
    const s = readState();
    if (s.codexPlusPlus?.safeMode === true)
        return false;
    return s.tweaks?.[id]?.enabled !== false;
}
function setTweakEnabled(id, enabled) {
    const s = readState();
    s.tweaks ??= {};
    s.tweaks[id] = { ...s.tweaks[id], enabled };
    writeState(s);
}
function readInstallerState() {
    try {
        return JSON.parse((0, node_fs_1.readFileSync)(runtime_paths_1.INSTALLER_STATE_FILE, "utf8"));
    }
    catch {
        return null;
    }
}
function readSelfUpdateState() {
    try {
        return JSON.parse((0, node_fs_1.readFileSync)(runtime_paths_1.SELF_UPDATE_STATE_FILE, "utf8"));
    }
    catch {
        return null;
    }
}
function writeSelfUpdateState(state) {
    try {
        (0, node_fs_1.writeFileSync)(runtime_paths_1.SELF_UPDATE_STATE_FILE, JSON.stringify(state, null, 2));
    }
    catch (e) {
        (0, runtime_paths_1.log)("warn", "writeSelfUpdateState failed:", String(e.message));
    }
}
function cleanOptionalString(value) {
    if (typeof value !== "string")
        return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}
//# sourceMappingURL=config-state.js.map