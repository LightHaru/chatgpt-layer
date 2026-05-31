/**
 * Code signing on macOS. After we mutate Info.plist or the Electron Framework
 * binary, the original signature is invalid. Re-signing with a stable local
 * identity keeps macOS privacy permissions attached to the patched app across
 * Codex++ repair runs on the same machine.
 *
 * `codesign --deep` does NOT recurse into `app.asar.unpacked` (it's not a
 * standard bundle layout), so native modules like `better-sqlite3.node` keep
 * their original Developer ID signature. Once the parent app is re-signed,
 * the dyld loader's Library Validation rejects the team-id mismatch and the
 * native module fails to load. We work around this by walking
 * `app.asar.unpacked` ourselves and re-signing every Mach-O file with the
 * same identity before signing the main bundle.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { lstatSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { platform, tmpdir } from "node:os";

export const DEFAULT_LOCAL_SIGNING_IDENTITY = "Codex++ Local Signing";

export type SigningMode = "local-identity" | "adhoc";

export interface CodeSigningResult {
  mode: SigningMode;
  identity: string;
  identityHash?: string;
  createdIdentity?: boolean;
}

export interface CodeSigningOptions {
  useLocalIdentity?: boolean;
  identityName?: string;
  preparedIdentity?: PreparedSigningIdentity | null;
}

export interface PreparedSigningIdentity {
  name: string;
  hash: string;
  created: boolean;
}

const MACHO_MAGICS = new Set([
  0xfeedface, // 32-bit
  0xfeedfacf, // 64-bit
  0xcafebabe, // fat
  0xcffaedfe, // 64-bit LE
  0xcefaedfe, // 32-bit LE
]);

export function signCodexApp(appRoot: string, opts: CodeSigningOptions = {}): CodeSigningResult | null {
  if (platform() !== "darwin") return null;

  const useLocalIdentity = opts.useLocalIdentity !== false;
  const localIdentity = useLocalIdentity
    ? opts.preparedIdentity ?? ensureLocalSigningIdentity(opts.identityName ?? DEFAULT_LOCAL_SIGNING_IDENTITY)
    : null;
  const signingIdentity = localIdentity?.hash ?? "-";

  // Step 1: pre-sign every Mach-O file under app.asar.unpacked. We do this
  // before the bundle-level pass because once the framework is re-signed,
  // every native load must agree.
  const resources = join(appRoot, "Contents", "Resources");
  walkAndSign(join(resources, "app.asar.unpacked"), signingIdentity);

  // Step 2: sign the bundle itself with --deep (covers Frameworks, Helpers).
  execFileSync(
    "codesign",
    ["--force", "--deep", "--sign", signingIdentity, appRoot],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  return localIdentity
    ? {
        mode: "local-identity",
        identity: localIdentity.name,
        identityHash: localIdentity.hash,
        createdIdentity: localIdentity.created,
      }
    : { mode: "adhoc", identity: "-" };
}

export function adHocSign(appRoot: string): void {
  signCodexApp(appRoot, { useLocalIdentity: false });
}

export function prepareCodeSigning(opts: CodeSigningOptions = {}): PreparedSigningIdentity | null {
  if (platform() !== "darwin") return null;

  requireExecutable("codesign", "macOS codesign is required to re-sign Codex.app after patching.");
  if (opts.useLocalIdentity === false) return null;

  requireExecutable("security", "macOS security is required to find Codex++'s local signing identity.");

  const identityName = opts.identityName ?? DEFAULT_LOCAL_SIGNING_IDENTITY;
  const existing = findCodeSigningIdentity(identityName);
  if (existing) return { ...existing, created: false };

  requireExecutable("openssl", "macOS openssl is required to create Codex++'s local signing identity.");
  return createLocalSigningIdentity(identityName);
}

function walkAndSign(root: string, signingIdentity: string): void {
  const failures: string[] = [];
  walkAndSignInto(root, root, signingIdentity, failures);
  if (failures.length > 0) {
    throw new Error(
      `Failed to sign ${failures.length} Mach-O file${failures.length === 1 ? "" : "s"} under ${root}:\n${failures.map((failure) => `  ${failure}`).join("\n")}`,
    );
  }
}

function walkAndSignInto(root: string, current: string, signingIdentity: string, failures: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(current);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(current, name);
    if (!isInsideCodeSigningRoot(root, full)) continue;
    let st;
    try {
      st = lstatSync(full);
    } catch {
      continue;
    }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      walkAndSignInto(root, full, signingIdentity, failures);
      continue;
    }
    if (!st.isFile()) continue;
    if (!isMachO(full)) continue;
    try {
      execFileSync(
        "codesign",
        ["--force", "--sign", signingIdentity, "--preserve-metadata=entitlements,flags", full],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
    } catch (e) {
      failures.push(`${full}: ${signingErrorMessage(e)}`);
    }
  }
}

export function isInsideCodeSigningRoot(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === "" || (rel !== "" && !rel.startsWith("..") && !isAbsolute(rel));
}

function signingErrorMessage(e: unknown): string {
  const err = e as { stderr?: Buffer | string; message?: string };
  return String(err.stderr ?? err.message ?? e).trim() || "codesign failed";
}

function ensureLocalSigningIdentity(identityName: string): PreparedSigningIdentity {
  return prepareCodeSigning({ identityName }) ?? (() => {
    throw new Error(`Local signing identity "${identityName}" is only available on macOS.`);
  })();
}

function findCodeSigningIdentity(identityName: string): Omit<PreparedSigningIdentity, "created"> | null {
  const result = spawnSync("security", ["find-identity", "-v", "-p", "codesigning"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return parseCodeSigningIdentities(output).find((identity) => identity.name === identityName) ?? null;
}

function createLocalSigningIdentity(identityName: string): PreparedSigningIdentity {
  const dir = mkdtempSync(join(tmpdir(), "codex-plusplus-signing-"));
  try {
    const configPath = join(dir, "openssl.cnf");
    const keyPath = join(dir, "identity.key");
    const certPath = join(dir, "identity.crt");
    const p12Path = join(dir, "identity.p12");
    const keychain = defaultUserKeychain();
    const p12Password = createPkcs12Password();

    writeFileSync(
      configPath,
      [
        "[req]",
        "distinguished_name=req_distinguished_name",
        "x509_extensions=v3_req",
        "prompt=no",
        "",
        "[req_distinguished_name]",
        `CN=${identityName}`,
        "",
        "[v3_req]",
        "basicConstraints=critical,CA:FALSE",
        "keyUsage=critical,digitalSignature",
        "extendedKeyUsage=codeSigning",
        "",
      ].join("\n"),
    );

    execFileSync("openssl", [
      "req",
      "-new",
      "-newkey",
      "rsa:2048",
      "-x509",
      "-sha256",
      "-days",
      "3650",
      "-nodes",
      "-config",
      configPath,
      "-keyout",
      keyPath,
      "-out",
      certPath,
    ], { stdio: "ignore" });

    execFileSyncRedacted("openssl", [
      "pkcs12",
      "-export",
      "-inkey",
      keyPath,
      "-in",
      certPath,
      "-name",
      identityName,
      "-out",
      p12Path,
      "-keypbe",
      "PBE-SHA1-3DES",
      "-certpbe",
      "PBE-SHA1-3DES",
      "-macalg",
      "sha1",
      "-passout",
      `pass:${p12Password}`,
    ], { stdio: ["ignore", "ignore", "pipe"] }, [p12Password]);

    execFileSyncRedacted("security", [
      "import",
      p12Path,
      "-k",
      keychain,
      "-P",
      p12Password,
      "-T",
      "/usr/bin/codesign",
    ], { stdio: ["ignore", "ignore", "pipe"] }, [p12Password]);

    execFileSync("security", [
      "add-trusted-cert",
      "-r",
      "trustRoot",
      "-p",
      "codeSign",
      "-k",
      keychain,
      certPath,
    ], { stdio: "ignore" });

    const created = findCodeSigningIdentity(identityName);
    if (!created) {
      throw new Error("created certificate was not found as a valid code signing identity");
    }
    return { ...created, created: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to create local signing identity "${identityName}": ${message}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function createPkcs12Password(): string {
  return randomBytes(24).toString("base64url");
}

function execFileSyncRedacted(
  command: string,
  args: string[],
  options: Parameters<typeof execFileSync>[2],
  redactions: string[],
): Buffer | string {
  try {
    return execFileSync(command, args, options);
  } catch (e) {
    const err = e as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string };
    let message = [err.stderr, err.stdout]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .join("\n");
    if (!message) message = err.message ?? String(e);
    for (const secret of redactions) {
      if (secret) message = message.split(secret).join("[redacted]");
    }
    throw new Error(`${command} failed: ${message}`);
  }
}

function defaultUserKeychain(): string {
  const result = spawnSync("security", ["default-keychain", "-d", "user"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.status !== 0 || !output) {
    throw new Error("could not determine the user default keychain");
  }
  return output.replace(/^"|"$/g, "");
}

function requireExecutable(command: string, message: string): void {
  const result = spawnSync("/bin/sh", ["-c", `command -v ${command}`], {
    stdio: "ignore",
  });
  if (result.status !== 0) {
    throw new Error(`[!] ${command} not installed\n\n${message}\nPaste this error into Codex if you need help.`);
  }
}

export function parseCodeSigningIdentities(output: string): Array<{ hash: string; name: string }> {
  const identities: Array<{ hash: string; name: string }> = [];
  for (const line of output.split(/\r?\n/)) {
    const match = /^\s*\d+\)\s+([0-9A-Fa-f]{40})\s+"([^"]+)"/.exec(line);
    if (!match) continue;
    identities.push({ hash: match[1], name: match[2] });
  }
  return identities;
}

function isMachO(path: string): boolean {
  try {
    const fd = readFileSync(path, { flag: "r" }).subarray(0, 4);
    if (fd.length < 4) return false;
    const magic = fd.readUInt32BE(0);
    return MACHO_MAGICS.has(magic);
  } catch {
    return false;
  }
}

export function verifySignature(appRoot: string): { ok: boolean; output: string } {
  if (platform() !== "darwin") return { ok: true, output: "(not macOS)" };
  try {
    const out = execFileSync("codesign", ["--verify", "--deep", "--strict", appRoot], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, output: out };
  } catch (e) {
    const err = e as { stderr?: Buffer | string };
    return { ok: false, output: String(err.stderr ?? e) };
  }
}

export interface SignatureInfo {
  ok: boolean;
  adHoc: boolean;
  teamIdentifier: string | null;
  authority: string[];
  output: string;
}

export function signatureInfo(appRoot: string): SignatureInfo {
  if (platform() !== "darwin") {
    return { ok: true, adHoc: false, teamIdentifier: null, authority: [], output: "(not macOS)" };
  }
  const result = spawnSync("codesign", ["-dv", "--verbose=4", appRoot], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const info = parseSignatureInfo(output);
  return { ...info, ok: result.status === 0, output };
}

function parseSignatureInfo(output: string): SignatureInfo {
  const team = /^TeamIdentifier=(.*)$/m.exec(output)?.[1]?.trim() ?? null;
  const authority = [...output.matchAll(/^Authority=(.*)$/gm)].map((m) => m[1].trim());
  return {
    ok: true,
    adHoc: /Signature=adhoc/.test(output) || team === "not set",
    teamIdentifier: team === "not set" ? null : team,
    authority,
    output,
  };
}

/** Remove the macOS quarantine xattr so the modified app launches without prompt. */
export function clearQuarantine(appRoot: string): void {
  if (platform() !== "darwin") return;
  try {
    execFileSync("xattr", ["-dr", "com.apple.quarantine", appRoot], { stdio: "ignore" });
  } catch {
    /* no-op if not set */
  }
}
