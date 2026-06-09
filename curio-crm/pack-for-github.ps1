# Creates CurioCRM-github.zip on Desktop — safe to upload to a private GitHub repo.
$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$outZip = Join-Path ([Environment]::GetFolderPath("Desktop")) "CurioCRM-github.zip"

$excludeDirs = @("node_modules", "dist", "data", ".git")
$excludeFiles = @(".env", "CurioCRM-github.zip")

$staging = Join-Path $env:TEMP "CurioCRM-github-staging"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

Write-Host "Copying project files (excluding secrets and heavy folders)..."

Get-ChildItem -Path $projectRoot -Force | ForEach-Object {
  if ($excludeDirs -contains $_.Name) { return }
  if ($excludeFiles -contains $_.Name) { return }
  Copy-Item -Path $_.FullName -Destination (Join-Path $staging $_.Name) -Recurse -Force
}

if (Test-Path $outZip) { Remove-Item $outZip -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($staging, $outZip)

Remove-Item $staging -Recurse -Force

Write-Host ""
Write-Host "Done: $outZip"
Write-Host "Upload contents to a new PRIVATE GitHub repo, then deploy via Render Blueprint."
Write-Host "See GITHUB-UPLOAD.md for step-by-step instructions."
