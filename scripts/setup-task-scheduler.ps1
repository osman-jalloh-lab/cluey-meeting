# PARAWI Morning Brief — Windows Task Scheduler Setup
# Run this once to register the 8 AM daily task.
# After setup, the task runs every day at 8:00 AM regardless of whether Claude Code is open.

$TaskName   = "PARAWI Morning Brief"
$BatFile    = "C:\Users\osman\OneDrive\Desktop\my dashboard\parawi\scripts\run-morning-brief.bat"
$LogFile    = "C:\Users\osman\OneDrive\Desktop\my dashboard\parawi\scripts\briefs\scheduler.log"

# Create briefs folder if it does not exist
$BriefsDir = Split-Path $LogFile
if (-not (Test-Path $BriefsDir)) {
    New-Item -ItemType Directory -Path $BriefsDir -Force | Out-Null
}

# Remove existing task if present
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "  Removed existing task."
}

# Action: run the bat file, log output
$Action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$BatFile`" >> `"$LogFile`" 2>&1"

# Trigger: daily at 8:00 AM
$Trigger = New-ScheduledTaskTrigger -Daily -At "08:00AM"

# Settings: run if missed (laptop was sleeping), 30 min time limit
$Settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -MultipleInstances IgnoreNew

# Principal: run as current user, only when logged in
$Principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName  $TaskName `
    -Action    $Action `
    -Trigger   $Trigger `
    -Settings  $Settings `
    -Principal $Principal `
    -Force | Out-Null

Write-Host ""
Write-Host "  OK  Task registered: $TaskName"
Write-Host "  Time: daily at 8:00 AM"
Write-Host "  Log: $LogFile"
Write-Host "  View: Task Scheduler > Task Scheduler Library"
Write-Host ""
Write-Host "  Run now:    Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "  Remove:     Unregister-ScheduledTask -TaskName '$TaskName'"
Write-Host ""
