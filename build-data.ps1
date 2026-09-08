param(
  [string]$SourceDirectory = 'C:\Users\juancarlosl\Downloads\IA-prg'
)

$ErrorActionPreference = 'Stop'
$destination = Join-Path $PSScriptRoot 'manuales'
New-Item -ItemType Directory -Force -Path $destination | Out-Null

$documents = Get-ChildItem -LiteralPath $SourceDirectory -Filter '*.txt' -File |
  Sort-Object Name |
  ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $destination $_.Name) -Force
    [ordered]@{
      title = $_.BaseName -replace '_', ' '
      file = $_.Name
      bytes = $_.Length
    }
  }

$documents | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $destination 'manifest.json') -Encoding utf8
Write-Host "Manuals copied: $($documents.Count)"
