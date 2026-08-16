$ErrorActionPreference = "Stop"

$Repo = if ($env:CHATGPT_LAYER_REPO) { $env:CHATGPT_LAYER_REPO } elseif ($env:CODEX_PLUSPLUS_REPO) { $env:CODEX_PLUSPLUS_REPO } else { "LightHaru/chatgpt-layer" }
$Ref = if ($env:CODEX_PLUSPLUS_REF) { $env:CODEX_PLUSPLUS_REF } else { "v1.1.3" }
$InstallDir = if ($env:CODEX_PLUSPLUS_SOURCE_DIR) { $env:CODEX_PLUSPLUS_SOURCE_DIR } else { Join-Path $HOME ".codex-plusplus\source" }

function Fail($Message) {
  [Console]::Error.WriteLine("[!] $Message")
  [Console]::Error.WriteLine("    Paste this error into Codex if you need help.")
  exit 1
}

function Require-Command($Command, $Message) {
  if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
    Fail $Message
  }
}

Require-Command node "Node.js 20+ is required but node was not found."
Require-Command npm.cmd "npm is required to build codex-plusplus from GitHub source."

$NodeMajorText = & node -p "Number(process.versions.node.split('.')[0])"
$NodeMajor = [int]$NodeMajorText
if ($NodeMajor -lt 20) {
  $NodeVersion = & node -v
  Fail "Node.js 20+ is required; found $NodeVersion."
}

$Work = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-plusplus." + [System.Guid]::NewGuid().ToString("N"))
$Archive = Join-Path $Work "source.zip"
$Extract = Join-Path $Work "extract"
$Next = Join-Path $Work "source"

try {
  New-Item -ItemType Directory -Force -Path $Work, $Extract | Out-Null

  $Url = "https://codeload.github.com/$Repo/zip/$Ref"
  Write-Host "Downloading ChatGPT Layer from https://github.com/$Repo ($Ref)..."
  try {
    Invoke-WebRequest -Uri $Url -OutFile $Archive -UseBasicParsing
  } catch {
    Fail "Download failed from https://github.com/$Repo ($Ref). Check the repo, branch, and network connection."
  }

  try {
    Expand-Archive -Path $Archive -DestinationPath $Extract -Force
    $ExtractedRoot = Get-ChildItem -Path $Extract -Directory | Select-Object -First 1
    if (-not $ExtractedRoot) {
      Fail "Could not unpack the codex-plusplus download."
    }
    Move-Item -Path $($ExtractedRoot.FullName) -Destination $Next
  } catch {
    Fail "Could not unpack the codex-plusplus download."
  }

  Write-Host "Installing dependencies..."
  Push-Location $Next
  try {
    if (-not (Test-Path "package-lock.json")) {
      Fail "package-lock.json is required; the lockfile was not modified."
    }
    & npm.cmd ci --workspaces --include-workspace-root --ignore-scripts
    if ($LASTEXITCODE -ne 0) {
      Fail "npm ci failed while installing codex-plusplus dependencies; the lockfile was not modified."
    }
  } finally {
    Pop-Location
  }

  Write-Host "Building ChatGPT Layer..."
  Push-Location $Next
  try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
      Fail "codex-plusplus build failed."
    }
  } finally {
    Pop-Location
  }

  $InstallParent = Split-Path -Parent $InstallDir
  New-Item -ItemType Directory -Force -Path $InstallParent | Out-Null
  $Previous = "$InstallDir.previous"
  if (Test-Path $Previous) {
    Remove-Item -Recurse -Force $Previous
  }
  if (Test-Path $InstallDir) {
    Move-Item -Path $InstallDir -Destination $Previous
  }
  Move-Item -Path $Next -Destination $InstallDir

  Write-Host "Finalizing workspace links..."
  Push-Location $InstallDir
  try {
    if (-not (Test-Path "package-lock.json")) {
      Fail "package-lock.json is required; the lockfile was not modified."
    }
    & npm.cmd ci --workspaces --include-workspace-root --ignore-scripts
    if ($LASTEXITCODE -ne 0) {
      Fail "npm ci failed while finalizing codex-plusplus workspace links; the lockfile was not modified."
    }
  } finally {
    Pop-Location
  }

  Write-Host "Running installer..."
  & node (Join-Path $InstallDir "packages\installer\dist\cli.js") install @args
  if ($LASTEXITCODE -ne 0) {
    Fail "codex-plusplus installer failed."
  }

  Write-Host ""
  Write-Host "codex-plusplus source installed at: $InstallDir"
} finally {
  if (Test-Path $Work) {
    Remove-Item -Recurse -Force $Work
  }
}
