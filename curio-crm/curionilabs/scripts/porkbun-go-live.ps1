# curionilabs.com -> Porkbun Static Hosting (no VPS)
# Re-points DNS to Porkbun static (pixie.porkbun.com) then FTP uploads dist\

param(
  [string]$Domain   = "curionilabs.com",
  [string]$AuthFile = (Join-Path $PSScriptRoot "..\.porkbun-auth.json"),
  [string]$EnvFile  = (Join-Path $PSScriptRoot "..\.env.porkbun"),
  [string]$DistDir  = (Join-Path $PSScriptRoot "..\dist"),
  [string]$StaticTarget = "pixie.porkbun.com",
  [string]$BadIp    = "216.158.237.213"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $AuthFile)) { throw "Missing $AuthFile" }
$AuthFile = (Resolve-Path $AuthFile).Path
$DistDir  = (Resolve-Path $DistDir).Path
$auth = Get-Content $AuthFile -Raw | ConvertFrom-Json
$apiKey  = $auth.apikey
$secret  = $auth.secretapikey
if (-not $apiKey -or -not $secret) { throw "Bad auth file (need apikey + secretapikey)" }

function Invoke-Porkbun([string]$path, [hashtable]$extra) {
  $body = @{ apikey = $apiKey; secretapikey = $secret }
  if ($extra) { foreach ($k in $extra.Keys) { $body[$k] = $extra[$k] } }
  $json = $body | ConvertTo-Json -Compress
  $tmp = New-TemporaryFile
  Set-Content -Path $tmp -Value $json -Encoding ascii
  try {
    $raw = & curl.exe -s -X POST "https://api.porkbun.com/api/json/v3$path" `
      -H "Content-Type: application/json" --data-binary "@$tmp"
    if ($LASTEXITCODE -ne 0) { throw "curl failed for $path" }
    return ($raw | ConvertFrom-Json)
  } finally {
    Remove-Item $tmp -ErrorAction SilentlyContinue
  }
}

Write-Host ""
Write-Host "[1/5] Verifying Porkbun API auth + access on $Domain"
$list = Invoke-Porkbun "/domain/listAll" $null
if ($list.status -ne "SUCCESS") { throw "listAll failed: $($list.message)" }
$me = $list.domains | Where-Object { $_.domain -eq $Domain }
if (-not $me) { throw "$Domain not on this Porkbun account" }
if ($me.apiAccess -ne 1) {
  Write-Host ""
  Write-Host "  BLOCKED: API access disabled for $Domain."
  Write-Host "  ONE manual click:"
  Write-Host "    https://porkbun.com/account/domainsSpeedy  ->  $Domain  ->  Details  ->  toggle 'API ACCESS' ON"
  Write-Host "    (or globally: https://porkbun.com/account/api -> 'API ACCESS' ON)"
  Write-Host "  Then re-run this script."
  Write-Host ""
  exit 2
}
Write-Host "      ok (apiAccess=1)"

Write-Host "[2/5] Reading current DNS records"
$records = Invoke-Porkbun "/dns/retrieve/$Domain" $null
if ($records.status -ne "SUCCESS") { throw "retrieve failed: $($records.message)" }
foreach ($r in $records.records) {
  Write-Host ("      {0,-5} {1,-30} -> {2}" -f $r.type, $r.name, $r.content)
}

$apexName = $Domain
$wwwName  = "www.$Domain"

Write-Host "[3/5] Removing VPS A records and stale apex/www records"
$toDelete = @()
foreach ($r in $records.records) {
  $isApex = ($r.name -eq $apexName)
  $isWww  = ($r.name -eq $wwwName)
  if (-not ($isApex -or $isWww)) { continue }
  if ($r.type -eq "A" -and $r.content -eq $BadIp)         { $toDelete += $r; continue }
  if ($r.type -eq "A"     -and ($isApex -or $isWww))      { $toDelete += $r; continue }
  if ($r.type -eq "AAAA"  -and ($isApex -or $isWww))      { $toDelete += $r; continue }
  if ($r.type -eq "ALIAS" -and $isApex -and $r.content -ne $StaticTarget) { $toDelete += $r; continue }
  if ($r.type -eq "CNAME" -and $isWww  -and $r.content -ne $StaticTarget) { $toDelete += $r; continue }
}
foreach ($r in $toDelete) {
  $del = Invoke-Porkbun "/dns/delete/$Domain/$($r.id)" $null
  if ($del.status -ne "SUCCESS") {
    Write-Host "      WARN delete $($r.type) $($r.name) failed: $($del.message)"
  } else {
    Write-Host "      del $($r.type) $($r.name) ($($r.content))"
  }
}

Write-Host "[4/5] Setting Porkbun Static Hosting DNS"
function Ensure-Record([string]$type, [string]$subdomain, [string]$content) {
  $body = @{ type = $type; content = $content; ttl = "600" }
  if ($subdomain -ne "") { $body["name"] = $subdomain }
  $resp = Invoke-Porkbun "/dns/createOrEdit/$Domain" $body
  if ($resp.status -ne "SUCCESS") {
    if ($resp.message -match "already exists" -or $resp.message -match "duplicate") {
      Write-Host "      keep $type $subdomain -> $content"
      return
    }
    throw "createOrEdit $type $subdomain failed: $($resp.message)"
  }
  Write-Host "      set $type $subdomain -> $content"
}
Ensure-Record "ALIAS" ""    $StaticTarget
Ensure-Record "CNAME" "www" $StaticTarget

Write-Host "[5/5] Uploading dist\ to Porkbun Static Hosting (FTP)"
if (-not (Test-Path (Join-Path $DistDir "index.html"))) {
  throw "Missing $DistDir\index.html (run: npm run build)"
}
$envVars = @{}
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
    $k,$v = $_ -split '=', 2
    $envVars[$k.Trim()] = $v.Trim().Trim('"')
  }
}
$ftpHost = $envVars.PORKBUN_FTP_HOST
$ftpUser = $envVars.PORKBUN_FTP_USER
$ftpPass = $envVars.PORKBUN_FTP_PASS
$ftpPort = if ($envVars.PORKBUN_FTP_PORT) { $envVars.PORKBUN_FTP_PORT } else { "21" }

if (-not $ftpHost -or -not $ftpUser -or -not $ftpPass) {
  Write-Host ""
  Write-Host "  DNS done. Upload still needs FTP creds."
  Write-Host "  ONE manual paste:"
  Write-Host "    Porkbun -> $Domain -> Static Hosting -> FTP Credentials -> copy host/user/pass"
  Write-Host "    Save them into $EnvFile (use .env.porkbun.example as template), then re-run."
  Write-Host ""
  exit 3
}

$base = "ftp://${ftpHost}:${ftpPort}/"
$auth2 = "${ftpUser}:${ftpPass}"
$files = Get-ChildItem -Path $DistDir -Recurse -File
Write-Host "      uploading $($files.Count) files via $ftpHost"
foreach ($f in $files) {
  $rel = $f.FullName.Substring($DistDir.Length + 1).Replace("\", "/")
  $url = $base + $rel
  & curl.exe --silent --show-error --ftp-create-dirs -T $f.FullName $url --user $auth2
  if ($LASTEXITCODE -ne 0) { throw "FTP upload failed: $rel" }
  Write-Host "        OK $rel"
}

Write-Host ""
Write-Host "  Live: https://$Domain"
Write-Host "        https://www.$Domain"
Write-Host ""
