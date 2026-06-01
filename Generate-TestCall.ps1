#Requires -Version 5.1
<#
.SYNOPSIS
    Generates a test call audio file using OpenAI TTS.

.DESCRIPTION
    Interactive script that lets you:
      - Select call language (Ukrainian / Russian / English / Mixed / Other)
      - Auto-generate a realistic e-commerce dialog via GPT, or enter one manually
      - Synthesize two-voice audio with OpenAI TTS (manager vs client)
      - Save the resulting MP3 to the current directory

.PARAMETER ApiKey
    OpenAI API key. Defaults to $env:OPENAI_API_KEY.

.EXAMPLE
    .\Generate-TestCall.ps1
#>
param(
    [string] $ApiKey = $env:OPENAI_API_KEY
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Fix console encoding so Cyrillic (and other non-ASCII) prints correctly
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding            = [System.Text.Encoding]::UTF8

# ── Helpers ────────────────────────────────────────────────────────────────────

function Write-Header([string]$Text) {
    Write-Host ""
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host ("  " + ("-" * $Text.Length)) -ForegroundColor DarkGray
}

function Read-Choice([string]$Prompt, [string[]]$Options, [string]$Default = "1") {
    Write-Host ""
    for ($i = 0; $i -lt $Options.Length; $i++) {
        $mark = if (($i + 1).ToString() -eq $Default) { "*" } else { " " }
        Write-Host "  $mark $($i + 1). $($Options[$i])"
    }
    Write-Host ""
    $raw = Read-Host "  $Prompt"
    if ($raw -eq "") { $raw = $Default }
    return $raw
}

function Invoke-OpenAI-Json([string]$Endpoint, [hashtable]$Body) {
    $json  = $Body | ConvertTo-Json -Depth 10 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    return Invoke-RestMethod `
        -Uri     "https://api.openai.com/v1/$Endpoint" `
        -Method  POST `
        -Headers @{ Authorization = "Bearer $ApiKey"; "Content-Type" = "application/json" } `
        -Body    $bytes
}

function Invoke-OpenAI-Binary([string]$Endpoint, [hashtable]$Body, [string]$OutFile) {
    $json  = $Body | ConvertTo-Json -Depth 10 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    Invoke-RestMethod `
        -Uri     "https://api.openai.com/v1/$Endpoint" `
        -Method  POST `
        -Headers @{ Authorization = "Bearer $ApiKey"; "Content-Type" = "application/json" } `
        -Body    $bytes `
        -OutFile $OutFile
}

# ── API key ────────────────────────────────────────────────────────────────────

Write-Header "AI Call Analytics - Test Call Generator"

# Fall back to .env file in the script's directory
if (-not $ApiKey) {
    $envFile = Join-Path $PSScriptRoot ".env"
    if (Test-Path $envFile) {
        $match = Select-String -Path $envFile -Pattern '^OPENAI_API_KEY\s*=\s*"?([^"]+)"?\s*$'
        if ($match) {
            $ApiKey = $match.Matches[0].Groups[1].Value.Trim()
        }
    }
}

if (-not $ApiKey) {
    Write-Host "  ERROR: OPENAI_API_KEY not found in environment or .env file." -ForegroundColor Red
    exit 1
}

# ── Language ───────────────────────────────────────────────────────────────────

Write-Header "Language"

$langOptions = @(
    "Ukrainian (uk)"
    "Russian (ru)"
    "English (en)"
    "Ukrainian + Russian mixed (uk_ru)"
    "Other language (tests unsupported-language rejection)"
)

$langChoice = Read-Choice "Language (1-5, default 1)" $langOptions "1"

$langCode = switch ($langChoice) {
    "1" { "uk" }
    "2" { "ru" }
    "3" { "en" }
    "4" { "uk_ru" }
    "5" { "other" }
    default { "uk" }
}

$otherLangName = ""
if ($langCode -eq "other") {
    Write-Host ""
    $otherLangName = Read-Host "  Language name (e.g. German, French, Polish)"
}

# Cyrillic labels for regex matching in generated dialogs
$managerRx = "^(Menedzher|Manager|" + [char]0x041C + [char]0x0435 + [char]0x043D + [char]0x0435 + [char]0x0434 + [char]0x0436 + [char]0x0435 + [char]0x0440 + ")\s*:\s*(.+)"
$clientRx  = "^(Klient|Client|" + [char]0x041A + [char]0x043B + [char]0x0456 + [char]0x0454 + [char]0x043D + [char]0x0442 + "|" + [char]0x041A + [char]0x043B + [char]0x0438 + [char]0x0435 + [char]0x043D + [char]0x0442 + ")\s*:\s*(.+)"

# Voices: alloy = manager, echo = client
$managerVoice = "alloy"
$clientVoice  = "echo"

# ── Dialog ─────────────────────────────────────────────────────────────────────

Write-Header "Dialog"

$dialogOptions = @("Auto-generate via GPT", "Enter manually")
$dialogChoice  = Read-Choice "Dialog source (1-2, default 1)" $dialogOptions "1"

if ($dialogChoice -eq "2") {
    Write-Host ""
    Write-Host "  Enter dialog lines. Example format:" -ForegroundColor DarkGray
    Write-Host "    Manager: Hello, how can I help you?" -ForegroundColor DarkGray
    Write-Host "    Client: I am looking for a Dyson vacuum." -ForegroundColor DarkGray
    Write-Host "  Leave a blank line when done." -ForegroundColor DarkGray
    Write-Host ""

    $dialogLines = @()
    while ($true) {
        $line = Read-Host "  "
        if ($line -eq "") { break }
        $dialogLines += $line
    }
    $dialog = $dialogLines -join "`n"

} else {
    Write-Host ""
    Write-Host "  Generating dialog with GPT..." -ForegroundColor Yellow

    $sysPrompt = "You are a script writer for e-commerce call center simulations. " +
                 "Return ONLY the dialog lines, no introduction, no explanation, no markdown."

    $outcomes = @("sale completed", "no sale (customer declined)", "potential sale (customer asked to call back)")
    $outcome  = $outcomes[(Get-Random -Maximum 3)]

    $userPrompt = switch ($langCode) {
        "uk" {
            "Create a realistic e-commerce call dialog in UKRAINIAN language.`n" +
            "Call outcome: $outcome`n" +
            "Format: each line starts with 'Manager: ' or 'Client: '`n" +
            "10-14 lines. Topic: selling electronics or home appliances (Dyson, iPhone, Samsung).`n" +
            "Write the dialog text in Ukrainian (Cyrillic script)."
        }
        "ru" {
            "Create a realistic e-commerce call dialog in RUSSIAN language.`n" +
            "Call outcome: $outcome`n" +
            "Format: each line starts with 'Manager: ' or 'Client: '`n" +
            "10-14 lines. Topic: selling electronics or home appliances (Dyson, iPhone, Samsung).`n" +
            "Write the dialog text in Russian (Cyrillic script)."
        }
        "en" {
            "Create a realistic e-commerce call dialog in ENGLISH.`n" +
            "Call outcome: $outcome`n" +
            "Format: each line starts with 'Manager: ' or 'Client: '`n" +
            "10-14 exchanges. Topic: selling electronics or home appliances (Dyson, iPhone, Samsung)."
        }
        "uk_ru" {
            "Create a realistic e-commerce call dialog where Manager speaks UKRAINIAN and Client speaks RUSSIAN (code-switching).`n" +
            "Call outcome: $outcome`n" +
            "Format: each line starts with 'Manager: ' or 'Client: '`n" +
            "10-14 lines. Topic: selling electronics or home appliances."
        }
        default {
            "Create a realistic e-commerce call dialog in $otherLangName language.`n" +
            "Call outcome: $outcome`n" +
            "Format: each line starts with 'Manager: ' or 'Client: '`n" +
            "10-14 exchanges. Topic: selling electronics or home appliances."
        }
    }

    $gptResult = Invoke-OpenAI-Json "chat/completions" @{
        model    = "gpt-4.1-mini"
        messages = @(
            @{ role = "system"; content = $sysPrompt }
            @{ role = "user";   content = $userPrompt }
        )
    }

    $dialog = $gptResult.choices[0].message.content.Trim()
}

# ── Synthesize audio ───────────────────────────────────────────────────────────

Write-Header "Synthesizing Audio"
Write-Host ""

$tempDir   = [System.IO.Path]::GetTempPath()
$partFiles = [System.Collections.Generic.List[string]]::new()

$lines = $dialog -split "`n" | Where-Object { $_.Trim() -ne "" }

foreach ($line in $lines) {
    $voice = $null
    $text  = $null
    $role  = $null

    if ($line -match $managerRx) {
        $voice = $managerVoice
        $text  = $Matches[2].Trim()
        $role  = "Manager"
    } elseif ($line -match $clientRx) {
        $voice = $clientVoice
        $text  = $Matches[2].Trim()
        $role  = "Client"
    } else {
        continue
    }

    if ($text -eq "") { continue }

    $partFile = Join-Path $tempDir ("call_part_" + $partFiles.Count + "_" + [System.Guid]::NewGuid().ToString("N").Substring(0,6) + ".mp3")

    Invoke-OpenAI-Binary "audio/speech" @{
        model = "tts-1"
        input = $text
        voice = $voice
    } $partFile

    $partFiles.Add($partFile)
    Write-Host "  [$role] line $($partFiles.Count) synthesized" -ForegroundColor Gray
}

if ($partFiles.Count -eq 0) {
    Write-Host "  No dialog lines matched the expected format. Aborting." -ForegroundColor Red
    exit 1
}

# ── Concatenate MP3 parts ──────────────────────────────────────────────────────

$timestamp  = (Get-Date).ToString("yyyyMMdd_HHmmss")
$outputName = "test_call_${langCode}_${timestamp}.mp3"
$outputFile = Join-Path $PSScriptRoot $outputName

Write-Host ""
Write-Host "  Merging $($partFiles.Count) audio parts..." -ForegroundColor Yellow

$outStream = [System.IO.File]::Open($outputFile, [System.IO.FileMode]::Create)
foreach ($part in $partFiles) {
    $bytes = [System.IO.File]::ReadAllBytes($part)
    $outStream.Write($bytes, 0, $bytes.Length)
    Remove-Item $part -Force
}
$outStream.Close()

$sizeMB = [math]::Round((Get-Item $outputFile).Length / 1MB, 2)

Write-Host ""
Write-Host "  Done! Saved: $outputName ($sizeMB MB)" -ForegroundColor Green
Write-Host "  Path: $outputFile" -ForegroundColor DarkGray
Write-Host ""
