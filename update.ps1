$ErrorActionPreference = "Stop"

foreach ($cmd in @("chatgpt-layer", "cgl", "codexplusplus", "codex-plusplus")) {
  if (Get-Command $cmd -ErrorAction SilentlyContinue) {
    & $cmd update @args
    exit $LASTEXITCODE
  }
}

[Console]::Error.WriteLine("[!] chatgpt-layer is not installed in PATH; running the installer instead.")
irm https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/install.ps1 | iex
