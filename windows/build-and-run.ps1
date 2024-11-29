param(
    [switch]$Run = $false,
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$BuildDir = $PSScriptRoot
$ProjectRoot = (Get-Item $BuildDir).Parent.FullName

Write-Host "Building Trilium Notes (Windows) from $BuildDir" -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot" -ForegroundColor Cyan

# Ensure we're in the windows directory
Set-Location $BuildDir

try {
    # Stage 1: Build the base image with TypeScript compilation
    Write-Host "`nStage 1: Building base image..." -ForegroundColor Green
    podman build -t trilium-build-stage1:latest -f Dockerfile.build-1 ..
    if ($LASTEXITCODE -ne 0) {
        throw "Stage 1 build failed"
    }

    # Stage 2: Build the final image
    Write-Host "`nStage 2: Building final image..." -ForegroundColor Green
    podman build -t trilium-next:latest -f Dockerfile.build-2 ..
    if ($LASTEXITCODE -ne 0) {
        throw "Stage 2 build failed"
    }

    Write-Host "`nBuild completed successfully!" -ForegroundColor Green

    # Optionally run the container
    if ($Run) {
        Write-Host "`nStarting Trilium container on port $Port..." -ForegroundColor Green
        
        # Check if a container is already running on the specified port
        $existingContainer = podman ps -a --filter "publish=$Port" --format "{{.ID}}"
        if ($existingContainer) {
            Write-Host "Stopping existing container using port $Port..." -ForegroundColor Yellow
            podman stop $existingContainer
            podman rm $existingContainer
        }

        # Run the new container
        podman run -d -p ${Port}:8080 trilium-next:latest
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`nTrilium is now running at http://localhost:$Port" -ForegroundColor Green
            Write-Host "To view logs: podman logs <container-id>" -ForegroundColor Cyan
            Write-Host "To stop: podman stop <container-id>" -ForegroundColor Cyan
        }
        else {
            throw "Failed to start container"
        }
    }
}
catch {
    Write-Host "`nError: $_" -ForegroundColor Red
    exit 1
}
