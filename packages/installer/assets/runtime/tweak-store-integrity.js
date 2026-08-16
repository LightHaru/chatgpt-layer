"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashStoreIndex = hashStoreIndex;
exports.assertStoreIndexMatchesPin = assertStoreIndexMatchesPin;
const node_crypto_1 = require("node:crypto");
const tweak_store_1 = require("./tweak-store");
function hashStoreIndex(body) {
    return (0, node_crypto_1.createHash)("sha256").update(body).digest("hex");
}
function assertStoreIndexMatchesPin(body, expectedSha256 = tweak_store_1.PINNED_TWEAK_STORE_INDEX_SHA256) {
    const hash = hashStoreIndex(body);
    if (hash !== expectedSha256) {
        throw new Error(`Store index hash ${hash} does not match runtime pin ${expectedSha256}`);
    }
}
//# sourceMappingURL=tweak-store-integrity.js.map