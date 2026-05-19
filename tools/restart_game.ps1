param(
  [int]$Port = 4184,
  [string]$HostName = "127.0.0.1"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")

$listeners = netstat -ano -p tcp |
  Select-String "$HostName`:$Port\s+.*LISTENING" |
  ForEach-Object {
    ($_ -split "\s+")[-1]
  } |
  Sort-Object -Unique

foreach ($pidText in $listeners) {
  $pidValue = 0
  if ([int]::TryParse($pidText, [ref]$pidValue)) {
    if ($pidValue -ne $PID) {
      Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
    }
  }
}

Start-Process `
  -FilePath "node" `
  -ArgumentList @("tools\static_server.mjs", ".", "$Port", $HostName) `
  -WorkingDirectory $root `
  -WindowStyle Hidden

Start-Sleep -Milliseconds 450

try {
  $response = Invoke-WebRequest -UseBasicParsing -Uri "http://$HostName`:$Port/?v=restart-check" -TimeoutSec 3
  Write-Output "Game restarted at http://$HostName`:$Port/ ($($response.StatusCode))"
} catch {
  Write-Output "Restart command ran, but health check failed: $($_.Exception.Message)"
  exit 1
}
