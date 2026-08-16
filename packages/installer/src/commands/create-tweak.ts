import kleur from "kleur";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import {
  validateTweakManifest,
  type TweakManifest,
  type TweakScope,
} from "../bundled-sdk.js";

interface CreateTweakOpts {
  id?: string;
  name?: string;
  repo?: string;
  scope?: TweakScope;
  force?: boolean;
}

export function createTweak(target: string, opts: CreateTweakOpts = {}): void {
  if (!target) throw new Error("target directory is required");

  const dir = resolve(target);
  const slug = slugify(basename(dir));
  const scope = opts.scope ?? "both";
  if (!["renderer", "main", "both"].includes(scope)) {
    throw new Error("--scope must be renderer, main, or both");
  }

  if (existsSync(dir)) {
    const entries = readdirSync(dir);
    if (entries.length > 0 || opts.force !== true) {
      throw new Error(`target already exists and is not empty: ${dir}`);
    }
  } else {
    mkdirSync(dir, { recursive: true });
  }

  const manifest: TweakManifest = {
    id: opts.id ?? `com.example.${slug}`,
    name: opts.name ?? titleize(slug),
    version: "0.1.0",
    githubRepo: opts.repo ?? `example/${slug}`,
    description: "A Codex++ tweak.",
    scope,
    main: "index.js",
    permissions: permissionsForScope(scope),
  };

  const validation = validateTweakManifest(manifest);
  if (!validation.ok) {
    throw new Error(
      validation.errors.map((issue) => `${issue.path}: ${issue.message}`).join("\n"),
    );
  }

  writeJson(dir, "manifest.json", manifest);
  writeFileSync(resolve(dir, "index.js"), templateForScope(scope), "utf8");
  writeJson(dir, "package.json", {
    name: slug,
    version: manifest.version,
    private: true,
    type: "commonjs",
    scripts: {
      validate: "codexplusplus validate-tweak .",
    },
    devDependencies: {
      "@codex-plusplus/sdk": "^0.1.3",
    },
  });
  writeFileSync(resolve(dir, "README.md"), readme(manifest), "utf8");

  console.log(kleur.green().bold("✓ Created Codex++ tweak"));
  console.log(`  Directory: ${kleur.cyan(dir)}`);
  console.log(`  Manifest:  ${kleur.cyan(resolve(dir, "manifest.json"))}`);
  console.log();
  console.log("Next:");
  console.log(`  1. Edit ${kleur.cyan(resolve(dir, "manifest.json"))}`);
  console.log(`  2. Run ${kleur.cyan(`codexplusplus validate-tweak ${dir}`)}`);
  console.log("  3. Copy or symlink this directory into your Codex++ tweaks directory");
}

function permissionsForScope(scope: TweakScope): TweakManifest["permissions"] {
  if (scope === "renderer") return ["settings"];
  if (scope === "main") return ["ipc", "filesystem"];
  return ["settings", "ipc", "filesystem"];
}

function templateForScope(scope: TweakScope): string {
  if (scope === "main") {
    return `module.exports = {
  start(api) {
    api.log.info("main tweak started");
    api.ipc.handle("ping", () => "pong from main");
  },
  stop() {
    // Clean up timers, listeners, or external resources here.
  },
};
`;
  }

  if (scope === "renderer") {
    return `module.exports = {
  start(api) {
    api.settings.registerPage({
      id: "main",
      title: api.manifest.name,
      render(root) {
        root.innerHTML = "";
        const message = document.createElement("p");
        message.textContent = "Renderer tweak loaded.";
        root.append(message);
      },
    });
  },
};
`;
  }

  return `module.exports = {
  start(api) {
    if (api.process === "main") {
      api.log.info("main half started");
      api.ipc.handle("ping", () => "pong from main");
      return;
    }

    api.settings.registerPage({
      id: "main",
      title: api.manifest.name,
      render(root) {
        root.innerHTML = "";

        const button = document.createElement("button");
        button.textContent = "Ping main";
        button.onclick = async () => {
          const result = await api.ipc.invoke("ping");
          output.textContent = String(result);
        };

        const output = document.createElement("p");
        output.textContent = "Click the button to test renderer-to-main IPC.";

        root.append(button, output);
      },
    });
  },
  stop() {
    // Clean up timers, listeners, or external resources here.
  },
};
`;
}

function readme(manifest: TweakManifest): string {
  return `# ${manifest.name}

${manifest.description}

## Development

\`\`\`sh
codexplusplus validate-tweak .
\`\`\`

Install by copying or symlinking this directory into your Codex++ tweaks directory.
`;
}

function writeJson(dir: string, name: string, value: unknown): void {
  writeFileSync(resolve(dir, name), JSON.stringify(value, null, 2) + "\n", "utf8");
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "my-tweak";
}

function titleize(input: string): string {
  return input
    .split(/[-_.]+/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
