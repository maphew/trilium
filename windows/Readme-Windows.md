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

## Additional Windows-Specific Information

This section will grow to include other Windows-specific instructions and configurations as needed, such as:
- Development environment setup
- Path and permission considerations
- Windows-specific troubleshooting
- PowerShell scripts and utilities
