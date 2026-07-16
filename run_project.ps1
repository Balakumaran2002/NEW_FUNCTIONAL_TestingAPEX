Write-Host "Starting Redis via Docker..."
$redisRunning = docker ps -q -f name=redis-server
if (-not $redisRunning) {
    docker start redis-server 2>$null
    if ($LASTEXITCODE -ne 0) {
        docker run -d -p 6379:6379 --name redis-server redis
    }
}

Write-Host "Setting up Python environment..."
Set-Location "python_backend"
if (-not (Test-Path "venv")) {
    python -m venv venv
}
& .\venv\Scripts\Activate.ps1
Set-Location ..

Write-Host "Starting FastAPI Backend..."
Start-Process powershell -ArgumentList "-NoExit -Command `"cd 'python_backend'; .\venv\Scripts\activate; python main.py`""

Write-Host "Starting Celery Worker..."
Start-Process powershell -ArgumentList "-NoExit -Command `"cd 'python_backend'; .\venv\Scripts\activate; celery -A app.celery_app.celery_app worker -P solo --loglevel=info`""

Write-Host "Setting up and starting Frontend..."
Start-Process powershell -ArgumentList "-NoExit -Command `"cd 'frontend'; npm install; npm run dev`""

Write-Host "Project is starting in separate terminal windows. Please check them for logs!"
