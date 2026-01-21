$basePath = "d:\VIisual Studio Code\Eduverse-redesign\client\src\components\landing"
$files = Get-ChildItem -Path $basePath -Recurse -Filter "*.tsx"

foreach ($file in $files) {
    Write-Host "Processing $($file.Name)..."
    $content = Get-Content $file.FullName -Raw
    $newContent = $content.Replace("surface-dark", "slate-800").Replace("surface-accent", "slate-700").Replace("bg-background-dark", "bg-slate-950")
    
    if ($content -ne $newContent) {
        $newContent | Set-Content $file.FullName -NoNewline
        Write-Host "Updated $($file.Name)"
    } else {
        Write-Host "No changes needed for $($file.Name)"
    }
}
