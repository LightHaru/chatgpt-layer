# ChatGPT Layer (unofficial ChatGPT desktop tweak loader).
# Class name Codexplusplus is kept so existing Homebrew taps continue to work.
class Codexplusplus < Formula
  desc "ChatGPT Layer (unofficial ChatGPT desktop tweak loader)"
  homepage "https://github.com/LightHaru/chatgpt-layer"
  url "https://github.com/LightHaru/chatgpt-layer.git",
      tag: "v1.1.4"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args(prefix: false),
           "--workspaces", "--include-workspace-root", "--ignore-scripts"
    system "npm", "run", "build"

    libexec.install Dir["*"]
    chmod 0755, libexec/"packages/installer/dist/cli.js"
    ["codexplusplus", "codex-plusplus"].each do |cmd|
      (bin/cmd).write <<~EOS
        #!/bin/bash
        exec "#{Formula["node"].opt_bin}/node" "#{libexec}/packages/installer/dist/cli.js" "$@"
      EOS
      chmod 0755, bin/cmd
    end
  end

  def caveats
    <<~EOS
      Run `codexplusplus install` to patch the ChatGPT desktop app.
      Run `codexplusplus update` to update ChatGPT Layer from GitHub source.
    EOS
  end

  test do
    assert_match(/chatgpt-layer, \d+\.\d+\.\d+/, shell_output("#{bin}/codexplusplus --version"))
    assert_match(/chatgpt-layer, \d+\.\d+\.\d+/, shell_output("#{bin}/codex-plusplus --version"))
  end
end
