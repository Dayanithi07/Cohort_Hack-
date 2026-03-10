param(
    [ValidateSet("up", "down", "status", "logs")]
    [string]$Action = "up"
)

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$FrontendPath = Join-Path $ProjectRoot "frontend"
$FrontendPidFile = Join-Path $ProjectRoot ".frontend-dev.pid"

function Get-Port3000Process {
    $connection = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $connection) {
        return $null
    }

    return Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
}

function Invoke-Compose {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    Push-Location $ProjectRoot
    try {
        docker compose @Args
    }
    finally {
        Pop-Location
    }
}

function Get-FrontendProcess {
    if (-not (Test-Path $FrontendPidFile)) {
        return $null
    }

    $pidText = (Get-Content $FrontendPidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if (-not $pidText) {
        return $null
    }

    $frontendPid = 0
    if (-not [int]::TryParse($pidText, [ref]$frontendPid)) {
        return $null
    }

    $process = Get-Process -Id $frontendPid -ErrorAction SilentlyContinue
    if ($process) {
        return $process
    }

    $fallbackProcess = Get-Port3000Process
    if ($fallbackProcess) {
        Set-Content -Path $FrontendPidFile -Value $fallbackProcess.Id
        return $fallbackProcess
    }

    return $null
}

function Start-Frontend {
    $runningProcess = Get-FrontendProcess
    if ($runningProcess) {
        Write-Host "Frontend is already running (PID $($runningProcess.Id))."
        return
    }

    $portProcess = Get-Port3000Process
    if ($portProcess) {
        Set-Content -Path $FrontendPidFile -Value $portProcess.Id
        Write-Host "Frontend is already running on port 3000 (PID $($portProcess.Id))."
        return
    }

    $command = "Set-Location '$FrontendPath'; if (-not (Test-Path '.\\node_modules')) { npm install }; npm run dev"
    $process = Start-Process -FilePath "powershell" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $command -WindowStyle Minimized -PassThru
    Set-Content -Path $FrontendPidFile -Value $process.Id
    Write-Host "Frontend started (PID $($process.Id)) on http://localhost:3000"
}

function Stop-Frontend {
    $runningProcess = Get-FrontendProcess
    if (-not $runningProcess) {
        $portProcess = Get-Port3000Process
        if ($portProcess) {
            Stop-Process -Id $portProcess.Id -Force
            Remove-Item $FrontendPidFile -Force -ErrorAction SilentlyContinue
            Write-Host "Frontend stopped (PID $($portProcess.Id)) via port 3000 lookup."
            return
        }

        if (Test-Path $FrontendPidFile) {
            Remove-Item $FrontendPidFile -Force
        }
        Write-Host "Frontend is not running."
        return
    }

    Stop-Process -Id $runningProcess.Id -Force
    Remove-Item $FrontendPidFile -Force -ErrorAction SilentlyContinue
    Write-Host "Frontend stopped (PID $($runningProcess.Id))."
}

switch ($Action) {
    "up" {
        Write-Host "Starting backend containers..."
        Invoke-Compose -Args @("up", "-d")

        Write-Host "Starting frontend dev server..."
        Start-Frontend

        Write-Host "Checking running services..."
        Invoke-Compose -Args @("ps")
    }
    "down" {
        Write-Host "Stopping frontend dev server..."
        Stop-Frontend

        Write-Host "Stopping backend containers..."
        Invoke-Compose -Args @("down")
    }
    "status" {
        $runningProcess = Get-FrontendProcess
        if ($runningProcess) {
            Write-Host "Frontend: running (PID $($runningProcess.Id))"
        }
        else {
            Write-Host "Frontend: stopped"
        }

        Invoke-Compose -Args @("ps")
    }
    "logs" {
        Write-Host "Streaming backend logs (Ctrl+C to stop)..."
        Invoke-Compose -Args @("logs", "-f", "backend")
    }
}
