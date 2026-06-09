# Upload dist/ to Porkbun Static Hosting (curionilabs.com / uixie)
param(
  [string]$DistDir = (Join-Path $PSScriptRoot "..\dist"),
  [string]$EnvFile = (Join-Path $PSScriptRoot "..\.env.porkbun")
)

$ErrorActionPreference = "Stop"
$DistDir = (Resolve-Path $DistDir).Path

if (-not (Test-Path (Join-Path $DistDir "index.html"))) {
  throw "Missing $DistDir\index.html — run: npm run build"
}

function Read-EnvFile([string]$path) {
  $vars = @{}
  if (-not (Test-Path $path)) { return $vars }
  Get-Content $path | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $k, $v = $_ -split '=', 2
    $vars[$k.Trim()] = $v.Trim().Trim('"')
  }
  $vars
}

$env = Read-EnvFile $EnvFile
$ftpHost = $env.PORKBUN_FTP_HOST
$ftpUser = $env.PORKBUN_FTP_USER
$ftpPass = $env.PORKBUN_FTP_PASS
$ftpPort = if ($env.PORKBUN_FTP_PORT) { $env.PORKBUN_FTP_PORT } else { "21" }

if (-not $ftpHost -or -not $ftpUser -or -not $ftpPass) {
  Write-Host ""
  Write-Host "  Missing FTP credentials."
  Write-Host "  1. Porkbun -> curionilabs.com -> Static Hosting -> FTP Credentials"
  Write-Host "  2. Copy .env.porkbun.example to .env.porkbun and fill in host/user/pass"
  Write-Host ""
  exit 1
}

$curl = Get-Command curl.exe -ErrorAction SilentlyContinue
if (-not $curl) { throw "curl.exe not found (Windows 10+ OpenSSH/curl)" }

$base = "ftp://${ftpHost}:${ftpPort}/"
$auth = "${ftpUser}:${ftpPass}"
$files = Get-ChildItem -Path $DistDir -Recurse -File

Write-Host "Uploading $($files.Count) files to Porkbun Static Hosting ($ftpHost)..."
foreach ($f in $files) {
  $rel = $f.FullName.Substring($DistDir.Length + 1).Replace("\", "/")
  $url = $base + $rel
  & curl.exe --silent --show-error --ftp-create-dirs -T $f.FullName $url --user $auth
  if ($LASTEXITCODE -ne 0) { throw "FTP upload failed: $rel" }
  Write-Host "  OK $rel"
}

Write-Host ""
Write-Host "  Live: https://curionilabs.com"
Write-Host "        https://www.curionilabs.com"
Write-Host ""
