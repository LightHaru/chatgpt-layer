/**
 * Re-exports the SDK symbols the installer CLI needs at runtime.
 * Build rewrites this module into a self-contained bundle so the published
 * package does not depend on unpublished workspace package @codex-plusplus/sdk.
 */
export {
  validateTweakManifest,
  type TweakManifest,
  type TweakScope,
} from "@codex-plusplus/sdk";
