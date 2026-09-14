$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
docker compose exec -T backend python manage.py migrate
if ($LASTEXITCODE -ne 0) { throw 'Database migration did not complete. Password setup was not started.' }
docker compose exec backend python manage.py admin --email 'admin@halcinema.example' --name 'HAL CINEMA管理者'
if ($LASTEXITCODE -ne 0) { throw 'Admin password setup did not complete.' }
