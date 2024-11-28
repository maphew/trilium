# Windows-Specific Instructions and Configurations

This directory contains configurations and instructions specifically for Windows systems. It only desccovers differences from the standard Linux/Mac setup.

## Docker Build Process

### Files
- `Dockerfile.build-stage1`: First stage build file that handles dependency installation and TypeScript compilation
- `Dockerfile.build-stage2`: Second stage build file that creates the final, optimized container

### Building with Podman
(Adjust for Docker if using that, commands will be similar.)

```powershell
# if needed
podman machine start 

# Navigate to the windows directory
cd windows

# build first stage (trailing `..` means use parent directory as build context)
podman build -t trilium-build-stage1:latest -f Dockerfile.build-1 ..

# build deployment image (using parent directory as build context)
podman build -t trilium-next:latest -f Dockerfile.build-2 ..

# run and test deployment image
podman run -d -p 8080:8080 trilium-next:latest
```

## Why These Files Exist

The standard build process can encounter issues on Windows systems due to:
- Host npm installations interfering with container npm operations
- Path resolution differences between Windows and Linux
- Node.js native module compilation challenges

## Contributing

If you encounter any Windows-specific issues or have improvements:
1. Test your changes
2. Document any new requirements or steps in this README
3. Submit a PR with your changes

## Current Status (WIP)

Currently debugging container startup issues. Latest error:
```
Error: Cannot find module '/usr/src/app/src/main'
```

### Troubleshooting Commands

```powershell
# Check container status
podman ps -a

# Get container logs
podman logs <container-id>

# Remove old containers
podman rm <container-id>

# Remove old images
podman rmi <image-id>

# Build with debug output
podman build -t trilium-build-stage1:latest -f windows/Dockerfile.build-1 .. --log-level=debug
```

### Next Steps
1. Debug the missing main module issue
2. Verify the source files are being copied correctly in both build stages
3. Check if we need to modify the node command to use the correct file extension (e.g., .ts or .js)

### Notes
- Both build stages complete successfully
- Container starts but exits immediately
- Current focus is on the second stage where we need to ensure all necessary files are present
- May need to investigate the webpack build output location

## Additional Windows-Specific Information

This section will grow to include other Windows-specific instructions and configurations as needed, such as:
- Development environment setup
- Path and permission considerations
- Windows-specific troubleshooting
- PowerShell scripts and utilities
