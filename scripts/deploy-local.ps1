[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$EnvFile,
  [Parameter(Mandatory)][string]$StateDirectory,
  [string]$PublicOrigin = '',
  [switch]$QuickTunnel,
  [switch]$Seed,
  [switch]$SkipFrontend
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envPath = (Resolve-Path -LiteralPath $EnvFile).Path
$state = [IO.Path]::GetFullPath($StateDirectory)
New-Item -ItemType Directory -Path $state -Force | Out-Null
$lock = [IO.File]::Open((Join-Path $state 'deploy.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
try {
  Push-Location -LiteralPath $root
  $revision = (git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Cannot determine release revision' }
  $env:VINLOOK_ENV_FILE = $envPath.Replace('\', '/')
  $env:VINLOOK_STATE_DIR = $state.Replace('\', '/')
  $env:VINLOOK_BACKUP_DIR = (Join-Path $state 'backups').Replace('\', '/')
  $env:VINLOOK_IMAGE_TAG = $revision
  $env:VINLOOK_RELEASE_SHA = $revision
  if ($env:GITHUB_RUN_ID) { $env:VINLOOK_CI_RUN_URL = "https://github.com/$env:GITHUB_REPOSITORY/actions/runs/$env:GITHUB_RUN_ID" }
  $compose = @('compose', '--project-name', 'vinlook', '--env-file', $envPath,
    '-f', 'infrastructure/docker/compose.yml', '-f', 'infrastructure/docker/compose.server.yml')
  function Invoke-Compose([string[]]$Arguments) {
    & docker @compose @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose failed: $($Arguments[0])" }
  }
  docker info --format '{{.ServerVersion}}' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Start Docker Desktop (Linux containers) before deploying.' }
  $previousFile = Join-Path $state 'release.json'
  $previous = if (Test-Path -LiteralPath $previousFile) { Get-Content -LiteralPath $previousFile -Raw | ConvertFrom-Json } else { $null }
  Invoke-Compose -Arguments @('build')
  try {
    Invoke-Compose -Arguments @('up', '-d', '--no-build', '--wait', '--wait-timeout', '240', 'web')
    if ($Seed) {
      Invoke-Compose -Arguments @('run', '--rm', '--no-deps', 'migrate', 'node', '--import', 'tsx', 'services/poi-service/src/database.ts', 'seed')
    }
    # Read the configured local HTTP port without logging any secrets.
    $portLine = Get-Content -LiteralPath $envPath | Where-Object { $_ -match '^WEB_PORT=' } | Select-Object -Last 1
    $webPort = if ($portLine) { ($portLine -split '=', 2)[1].Trim() } else { '8080' }
    node scripts/smoke.mjs "http://127.0.0.1:$webPort"
    if ($LASTEXITCODE -ne 0) { throw 'Backend smoke checks failed' }
    if ($QuickTunnel) {
      Invoke-Compose -Arguments @('--profile', 'free-tunnel', 'up', '-d', '--no-deps', 'quick-tunnel')
      for ($attempt = 0; $attempt -lt 30; $attempt++) {
        $tunnelLogs = & docker @compose logs --no-color quick-tunnel 2>&1 | Out-String
        $tunnelMatches = [regex]::Matches($tunnelLogs, 'https://[a-z0-9-]+\.trycloudflare\.com')
        if ($tunnelMatches.Count) { $PublicOrigin = $tunnelMatches[$tunnelMatches.Count - 1].Value; break }
        Start-Sleep -Seconds 2
      }
    }
    if (!$PublicOrigin -and !$SkipFrontend) { throw 'Set VINLOOK_PUBLIC_ORIGIN or enable QuickTunnel.' }
    if ($PublicOrigin) {
      $reachable = $false
      for ($attempt = 0; $attempt -lt 15; $attempt++) {
        try { $health = Invoke-RestMethod -Uri "$PublicOrigin/health/ready" -TimeoutSec 10; if ($health.status -eq 'ok') { $reachable = $true; break } } catch { }
        Start-Sleep -Seconds 2
      }
      if (!$reachable) { throw 'Public backend HTTPS health check failed' }
    }
    if (!$SkipFrontend) {
      $env:VINLOOK_API_ORIGIN = $PublicOrigin
      node scripts/build-web.mjs
      if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
      # CLI authentication comes from VERCEL_TOKEN or the runner user's Vercel login.
      node scripts/release-frontend.mjs
      if ($LASTEXITCODE -ne 0) { throw 'Frontend release failed; production was not promoted.' }
    }
    @{ revision = $revision; image_tag = $revision; public_origin = $PublicOrigin; updated_at = (Get-Date).ToUniversalTime().ToString('o') } |
      ConvertTo-Json | Set-Content -LiteralPath $previousFile -Encoding utf8
    if ($env:GITHUB_OUTPUT -and $PublicOrigin) { "api_origin=$PublicOrigin" | Add-Content -LiteralPath $env:GITHUB_OUTPUT }
  } catch {
    if ($previous -and $previous.image_tag -ne $revision) {
      Write-Warning 'Release failed. Restoring the previous application images; database migrations are not reversed.'
      $env:VINLOOK_IMAGE_TAG = $previous.image_tag
      & docker @compose up -d --no-build --no-deps --wait poi navigation translation gateway web
    }
    throw
  }
} finally {
  Pop-Location
  $lock.Dispose()
}
