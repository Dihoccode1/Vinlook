[CmdletBinding()]
param(
  [string]$Repository = 'Dihoccode1/Vinlook',
  [string]$Name = "vinlook-$env:COMPUTERNAME"
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $root '.local-runner/agent'
New-Item -ItemType Directory -Path $runner -Force | Out-Null
if (!(Test-Path -LiteralPath (Join-Path $runner '.runner'))) {
  $downloads = gh api "repos/$Repository/actions/runners/downloads" | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw 'GitHub admin authentication is required: gh auth login' }
  $package = $downloads | Where-Object { $_.os -eq 'win' -and $_.architecture -eq 'x64' } | Select-Object -First 1
  if (!$package -or !$package.sha256_checksum) { throw 'No official Windows x64 runner with a checksum was returned.' }
  $archive = Join-Path $root '.local-runner/runner.zip'
  Invoke-WebRequest -Uri $package.download_url -OutFile $archive
  if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $package.sha256_checksum) { throw 'Runner checksum mismatch' }
  Expand-Archive -LiteralPath $archive -DestinationPath $runner -Force
  $registration = gh api --method POST "repos/$Repository/actions/runners/registration-token" | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw 'Cannot obtain a short-lived runner registration token' }
  try {
    Push-Location -LiteralPath $runner
    & ./config.cmd --url "https://github.com/$Repository" --token $registration.token --name $Name --labels vinlook-deploy --work _work --unattended
    if ($LASTEXITCODE -ne 0) { throw 'Runner registration failed' }
  } finally { $registration = $null; Pop-Location }
}
$launcher = Join-Path $root '.local-runner/start.ps1'
$escapedRunner = $runner.Replace("'", "''")
@"
Set-Location -LiteralPath '$escapedRunner'
& ./run.cmd
"@ | Set-Content -LiteralPath $launcher -Encoding utf8
$pwsh = (Get-Command pwsh -ErrorAction Stop).Source
$action = New-ScheduledTaskAction -Execute $pwsh -Argument "-NoProfile -WindowStyle Hidden -File `"$launcher`""
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Vinlook GitHub Runner' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName 'Vinlook GitHub Runner'
Write-Output 'Runner configured for trusted main deployments and will start at Windows sign-in.'
