# Enable BuildKit
$env:DOCKER_BUILDKIT=1

# Create a clean build context
$buildContext = "docker-build-context"
Write-Host "Creating clean build context in ./$buildContext..." -ForegroundColor Green

# Clean up any existing context
if (Test-Path $buildContext) {
    Remove-Item -Recurse -Force $buildContext
}
New-Item -ItemType Directory -Path $buildContext | Out-Null

# Copy only essential files
Write-Host "Copying essential files..." -ForegroundColor Green
Copy-Item "build" -Destination "$buildContext/build" -Recurse
Copy-Item "src/public/app-dist" -Destination "$buildContext/src/public/app-dist" -Recurse
Copy-Item "package.json" -Destination "$buildContext/"
Copy-Item "server-package.json" -Destination "$buildContext/"
Copy-Item "config-sample.ini" -Destination "$buildContext/"
Copy-Item "docker_healthcheck.ts" -Destination "$buildContext/"
Copy-Item "start-docker.sh" -Destination "$buildContext/"

# Build from clean context
Write-Host "Building Docker image from clean context..." -ForegroundColor Green
Push-Location $buildContext
try {
    docker build --progress=plain -f ../Dockerfile.alpine -t trilium-local .
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Build complete! Run the container with:" -ForegroundColor Green
        Write-Host "docker run -d --name trilium -p 8080:8080 trilium-local" -ForegroundColor Green
    }
}
finally {
    Pop-Location
    Write-Host "Cleaning up build context..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $buildContext
}
