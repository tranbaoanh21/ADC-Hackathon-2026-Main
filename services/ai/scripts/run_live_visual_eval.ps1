[CmdletBinding()]
param(
    [string]$Model = "gemini-3.1-flash-lite",
    [int]$Port = 8011
)

$ErrorActionPreference = "Stop"

$serviceRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent (Split-Path -Parent $serviceRoot)
$python = Join-Path $serviceRoot ".venv\Scripts\python.exe"
$manifest = Join-Path $repoRoot "evals\cases\visual-local.json"
$baseUrl = "http://127.0.0.1:$Port"

if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
    throw "Python virtual environment is missing at services/ai/.venv."
}
if (-not (Test-Path -LiteralPath $manifest -PathType Leaf)) {
    throw "Visual eval manifest is missing."
}
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $Port is already in use. Choose another port with -Port."
}

$secureApiKey = Read-Host "GEMINI_API_KEY" -AsSecureString
$credential = [System.Net.NetworkCredential]::new("", $secureApiKey)
$apiKey = $credential.Password
if ([string]::IsNullOrWhiteSpace($apiKey)) {
    throw "GEMINI_API_KEY is required."
}

$previousEnvironment = @{
    AI_PROVIDER = $env:AI_PROVIDER
    GEMINI_API_KEY = $env:GEMINI_API_KEY
    GEMINI_MODEL = $env:GEMINI_MODEL
    INTERNAL_SERVICE_TOKEN = $env:INTERNAL_SERVICE_TOKEN
}
$temporaryTokenBytes = New-Object byte[] 32
$randomNumberGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $randomNumberGenerator.GetBytes($temporaryTokenBytes)
}
finally {
    $randomNumberGenerator.Dispose()
}
$temporaryToken = -join ($temporaryTokenBytes | ForEach-Object {
    $_.ToString("x2")
})
$serviceProcess = $null
$exitCode = 1

try {
    $env:AI_PROVIDER = "gemini"
    $env:GEMINI_API_KEY = $apiKey
    $env:GEMINI_MODEL = $Model
    $env:INTERNAL_SERVICE_TOKEN = $temporaryToken

    $serviceProcess = Start-Process `
        -FilePath $python `
        -ArgumentList @(
            "-m", "uvicorn", "app.main:app",
            "--host", "127.0.0.1",
            "--port", $Port.ToString()
        ) `
        -WorkingDirectory $serviceRoot `
        -WindowStyle Hidden `
        -PassThru

    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if ($serviceProcess.HasExited) {
            throw "Gemini FastAPI process exited before becoming healthy."
        }
        try {
            $health = Invoke-WebRequest `
                -UseBasicParsing `
                -Uri "$baseUrl/health" `
                -TimeoutSec 2
            if ($health.StatusCode -eq 200) {
                $ready = $true
                break
            }
        }
        catch {
            Start-Sleep -Milliseconds 500
        }
    }
    if (-not $ready) {
        throw "Gemini FastAPI did not become healthy within the timeout."
    }

    & $python `
        (Join-Path $serviceRoot "scripts\visual_eval.py") `
        --manifest $manifest `
        --mode live `
        --base-url $baseUrl `
        --allow-external-assets
    $exitCode = $LASTEXITCODE
}
finally {
    if ($serviceProcess -and -not $serviceProcess.HasExited) {
        Stop-Process -Id $serviceProcess.Id
        Wait-Process -Id $serviceProcess.Id -ErrorAction SilentlyContinue
    }

    foreach ($name in $previousEnvironment.Keys) {
        $previousValue = $previousEnvironment[$name]
        if ($null -eq $previousValue) {
            Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
        }
        else {
            Set-Item -LiteralPath "Env:$name" -Value $previousValue
        }
    }

    $apiKey = $null
    $temporaryToken = $null
    $credential = $null
    $secureApiKey.Dispose()
}

exit $exitCode
