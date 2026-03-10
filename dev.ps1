param(
    [ValidateSet("up", "down", "status", "logs")]
    [string]$Action = "up"
)

& (Join-Path $PSScriptRoot "scripts\dev.ps1") -Action $Action
