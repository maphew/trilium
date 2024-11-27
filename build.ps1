# Build the first stage (strip dependencies and compile TypeScript)
Write-Host "Building first stage..."
podman build -t tnext-build -f Dockerfile.build .

# Create a temporary container to copy build artifacts
Write-Host "Extracting build artifacts..."
$BUILD_CONTAINER = $(podman create tnext-build)
podman cp "${BUILD_CONTAINER}:/build-output" ./build
podman rm $BUILD_CONTAINER

# Build the final container
Write-Host "Building final container..."
podman build -t tnext-alpine -f Dockerfile.alpine .

Write-Host "Build complete!"
