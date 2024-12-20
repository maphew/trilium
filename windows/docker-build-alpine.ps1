# Clean up any existing build directory
if (Test-Path build) {
    Write-Host "Cleaning up previous build directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force build
}

# Enable BuildKit
$env:DOCKER_BUILDKIT=1

# Create a temporary context directory
$tempContext = "tmp/docker-build-context"
if (Test-Path $tempContext) {
    Remove-Item -Recurse -Force $tempContext
}

Write-Host "Creating clean build context using git..." -ForegroundColor Green
New-Item -ItemType Directory -Path $tempContext -Force | Out-Null

git archive --format=tar HEAD | tar x -C $tempContext

Write-Host "Building stage in container (compile TypeScript, exclude Electron)..." -ForegroundColor Green
# user builder-specific .dockerignore
Copy-Item windows/builder.dockerignore "$tempContext/.dockerignore"

# Build from temp context
$originalLocation = Get-Location
Set-Location $tempContext
docker build -f ../windows/Dockerfile.builder -t trilium-builder .
$buildExitCode = $LASTEXITCODE
Set-Location $originalLocation

if ($buildExitCode -ne 0) {
    # Remove-Item -Recurse -Force $tempContext
    exit 1
}

# Run the builder to get the compiled output
# /output from docker becomes ./build in our current dir
Write-Host "Extracting built files, will take awhile... output will be in ./build" -ForegroundColor Green
docker run --rm -v ${PWD}:/output trilium-builder

# Clean up temp context
Write-Host "Cleaning up temporary context..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $tempContext

# Build the final image, if cmd arg says so
if ($args[0] -eq "build") {
    Write-Host "Building final Docker image..." -ForegroundColor Green
    docker build --progress=plain -f Dockerfile.alpine -t trilium-local .
    
    # # Clean up build directory after final image is built
    # Write-Host "Cleaning up build directory..." -ForegroundColor Yellow
    # Remove-Item -Recurse -Force build
    
    Write-Host "Build complete! Run the container with:" -ForegroundColor Green
    Write-Host "docker run -d --name trilium -p 8080:8080 trilium-local" -ForegroundColor Green
}
