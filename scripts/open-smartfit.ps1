$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$portableNode = 'C:\tmp\node-v24.14.0-win-x64'
$npm = $null

function Test-LocalPort {
  param(
    [string]$HostName,
    [int]$Port
  )

  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $connection = $client.BeginConnect($HostName, $Port, $null, $null)
    if (-not $connection.AsyncWaitHandle.WaitOne(500, $false)) {
      return $false
    }
    $client.EndConnect($connection)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

if (Test-Path (Join-Path $portableNode 'npm.cmd')) {
  $env:PATH = "$portableNode;$env:PATH"
  $npm = Join-Path $portableNode 'npm.cmd'
} else {
  $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
  if ($npmCommand) {
    $npm = $npmCommand.Source
  }
}

if (-not $npm) {
  Write-Host 'Ascend AI needs Node.js/npm to run locally.'
  Write-Host 'Install Node.js, or ask Codex to set up the local runtime again.'
  Read-Host 'Press Enter to close'
  exit 1
}

Set-Location $projectRoot

if (-not (Test-Path (Join-Path $projectRoot 'node_modules'))) {
  & $npm install --script-shell 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
}

$isRunning = Test-LocalPort -HostName '127.0.0.1' -Port 5173

if (-not $isRunning) {
  $serverCommand = @"
`$env:PATH='$portableNode;' + `$env:PATH
Set-Location '$projectRoot'
& '$npm' run dev -- --host 127.0.0.1
"@

  Start-Process powershell.exe `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $serverCommand) `
    -WorkingDirectory $projectRoot `
    -WindowStyle Minimized

  Start-Sleep -Seconds 3
}

Start-Process 'http://127.0.0.1:5173'
