# PowerShell script to replace localhost URLs with environment variable configuration
# Run this with: .\replace-localhost-urls.ps1

Write-Host "Starting localhost URL replacement..." -ForegroundColor Cyan

$clientSrcPath = Join-Path $PSScriptRoot "client\src"
$configImport = "import { apiEndpoint, assetUrl } from '@/lib/config';"

# Pattern replacements for API calls
$apiPatterns = @(
    @{
        Pattern = "fetch\('http://localhost:3001/api/([^']+)'"
        Replacement = "fetch(apiEndpoint('/api/`$1')"
    },
    @{
        Pattern = 'fetch\("http://localhost:3001/api/([^"]+)"'
        Replacement = 'fetch(apiEndpoint("/api/$1")'
    },
    @{
        Pattern = 'fetch\(`http://localhost:3001/api/([^`]+)`'
        Replacement = 'fetch(apiEndpoint(`/api/$1`)'
    },
    @{
        Pattern = "= 'http://localhost:3001/api/([^']+)'"
        Replacement = "= apiEndpoint('/api/`$1')"
    },
    @{
        Pattern = '= "http://localhost:3001/api/([^"]+)"'
        Replacement = '= apiEndpoint("/api/$1")'
    },
    @{
        Pattern = '= `http://localhost:3001/api/([^`]+)`'
        Replacement = '= apiEndpoint(`/api/$1`)'
    }
)

# Pattern replacements for asset URLs
$assetPatterns = @(
    @{
        Pattern = '`http://localhost:3001\$\{([^}]+)\}`'
        Replacement = 'assetUrl($1)'
    },
    @{
        Pattern = '"http://localhost:3001" \+ '
        Replacement = 'assetUrl('
    }
)

function Add-ConfigImport {
    param([string]$content)
    
    if ($content -match "from '@/lib/config'" -or $content -match 'from "@/lib/config"') {
        return $content
    }
    
    $lines = $content -split "`n"
    $lastImportIndex = -1
    
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i].Trim() -match '^import ') {
            $lastImportIndex = $i
        }
    }
    
    if ($lastImportIndex -eq -1) {
        return $configImport + "`n" + $content
    }
    
    $lines = @($lines[0..$lastImportIndex]) + @($configImport) + @($lines[($lastImportIndex + 1)..($lines.Length - 1)])
    return $lines -join "`n"
}

function Process-File {
    param([string]$filePath)
    
    $content = Get-Content $filePath -Raw -Encoding UTF8
    
    if (-not ($content -match 'localhost:3001')) {
        return
    }
    
    $modified = $false
    $originalContent = $content
    
    # Apply API pattern replacements
    foreach ($pattern in $apiPatterns) {
        if ($content -match $pattern.Pattern) {
            $content = $content -replace $pattern.Pattern, $pattern.Replacement
            $modified = $true
        }
    }
    
    # Apply asset pattern replacements
    foreach ($pattern in $assetPatterns) {
        if ($content -match $pattern.Pattern) {
            $content = $content -replace $pattern.Pattern, $pattern.Replacement
            $modified = $true
        }
    }
    
    if ($modified) {
        $content = Add-ConfigImport -content $content
        Set-Content $filePath -Value $content -Encoding UTF8 -NoNewline
        $relativePath = $filePath.Replace($PSScriptRoot, "").TrimStart("\")
        Write-Host "Updated: $relativePath" -ForegroundColor Green
    }
}

# Process all TypeScript/TSX files in client/src
Get-ChildItem -Path $clientSrcPath -Include *.ts,*.tsx -Recurse | ForEach-Object {
    if ($_.DirectoryName -notmatch "node_modules") {
        Process-File -filePath $_.FullName
    }
}

Write-Host "`nReplacement complete!" -ForegroundColor Cyan
Write-Host "Don't forget to:" -ForegroundColor Yellow
Write-Host "   1. Review the changes" -ForegroundColor Yellow
Write-Host "   2. Test the application" -ForegroundColor Yellow
Write-Host "   3. Update .env files with production URLs" -ForegroundColor Yellow
