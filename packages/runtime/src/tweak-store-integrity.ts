import { createHash } from "node:crypto";
import { PINNED_TWEAK_STORE_INDEX_SHA256 } from "./tweak-store";

export function hashStoreIndex(body: string | Buffer): string {
  return createHash("sha256").update(body).digest("hex");
}

export function assertStoreIndexMatchesPin(
  body: string | Buffer,
  expectedSha256 = PINNED_TWEAK_STORE_INDEX_SHA256,
): void {
  const hash = hashStoreIndex(body);
  if (hash !== expectedSha256) {
    throw new Error(`Store index hash ${hash} does not match runtime pin ${expectedSha256}`);
  }
}
