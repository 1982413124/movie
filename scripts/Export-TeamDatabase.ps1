param(
    [string]$ProjectDirectory = (Split-Path -Parent $PSScriptRoot),
    [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path -LiteralPath $ProjectDirectory).Path
if (-not (Test-Path -LiteralPath (Join-Path $projectPath 'docker-compose.yml'))) {
    throw 'docker-compose.yml があるプロジェクトを指定してください。'
}
$databaseContainer = (& docker compose --project-directory $projectPath ps -q db | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or -not $databaseContainer) {
    throw '移行元の db コンテナが起動していません。'
}
if (-not $OutputDirectory) {
    $OutputDirectory = Join-Path $projectPath ('backups/team-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
}
$backupPath = [System.IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $backupPath) {
    throw '保存先が既に存在します。上書きせず、新しいフォルダを指定してください。'
}
New-Item -ItemType Directory -Path $backupPath | Out-Null
$containerDump = '/tmp/hal-team-' + [guid]::NewGuid().ToString('N') + '.dump'
try {
    # Write the binary archive in the container, then copy it; do not pipe through text encoding.
    & docker exec $databaseContainer sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges --no-tablespaces --file="$1"' hal-export $containerDump
    if ($LASTEXITCODE -ne 0) { throw 'DBのバックアップに失敗しました。' }
    & docker exec $databaseContainer pg_restore --list $containerDump | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'DBバックアップを読み込めませんでした。' }
    $dumpPath = Join-Path $backupPath 'movie.dump'
    & docker cp ($databaseContainer + ':' + $containerDump) $dumpPath
    if ($LASTEXITCODE -ne 0) { throw 'DBバックアップのコピーに失敗しました。' }
    $uploads = Join-Path $projectPath 'backend/uploads'
    if (Test-Path -LiteralPath $uploads -PathType Container) {
        Copy-Item -LiteralPath $uploads -Destination (Join-Path $backupPath 'uploads') -Recurse
    }
    $files = @(Get-ChildItem -LiteralPath $backupPath -File -Recurse | ForEach-Object {
        [ordered]@{
            path = $_.FullName.Substring($backupPath.Length + 1).Replace('\', '/')
            bytes = $_.Length
            sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
        }
    })
    [ordered]@{
        created_at = (Get-Date).ToUniversalTime().ToString('o')
        files = $files
    } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $backupPath 'manifest.json') -Encoding utf8
    Write-Output "バックアップを保存しました: $backupPath"
    Write-Output '元のDBと画像は変更していません。最終移行時は書き込みを止めてから実行してください。'
} finally {
    # Only the exact temporary archive generated above is removed, inside the container.
    if ($containerDump -match '^/tmp/hal-team-[a-f0-9]{32}\.dump$') {
        & docker exec $databaseContainer rm -f -- $containerDump | Out-Null
    }
}
