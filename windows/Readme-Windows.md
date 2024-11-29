# Windows-Specific Instructions and Configurations

This directory contains configurations and instructions specifically for Windows systems. It only desccovers differences from the standard Linux/Mac setup.

## Docker Build Process

### Files
- `Dockerfile.build-stage1`: First stage build file that handles dependency installation and TypeScript compilation
- `Dockerfile.build-stage2`: Second stage build file that creates the final, optimized container
- `build-and-run.ps1`: PowerShell script to simplify the build and run process

### Building with Podman
(Adjust for Docker if using that, commands will be similar.)

Option 1: (recommended)
_3 examples of using the build-and-run script_

```powershell
# Build only
./build-and-run.ps1

# Build and run on default port (8080)
./build-and-run.ps1 -Run

# Build and run on custom port
./build-and-run.ps1 -Run -Port 9000
```

Option 2: Manual Build

```powershell
# if needed
podman machine start 

# Navigate to the windows directory
cd windows

# Option 2: Manual build steps
# build first stage (trailing `..` means use parent directory as build context)
podman build -t trilium-build-stage1:latest -f Dockerfile.build-1 ..

# build deployment image (using parent directory as build context)
podman build -t trilium-next:latest -f Dockerfile.build-2 ..

# run and test deployment image
podman run -d -p 8080:8080 trilium-next:latest
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

------------------------------------------------------------------------------

# Current Status (WIP)

Currently debugging container startup issues. Latest error:
```
Error: Cannot find module '/usr/src/app/src/main'
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

## Work in Progress (WIP)

### Current Build Status
The Docker build process is being updated to handle TypeScript compilation correctly. Current issues:

1. TypeScript compilation fails due to:
   - Import attributes requiring `module: "nodenext"` or `"esnext"`
   - Missing base tsconfig.json reference
   - JSON module resolution issues

### Next Steps
1. Update TypeScript configuration to properly handle:
   - JSON imports with proper import attributes
   - Module resolution for server-side TypeScript files
   - Base tsconfig.json inheritance

2. Consider separating client and server TypeScript configurations to better handle their different requirements

3. Review and update the webpack configuration to ensure it aligns with the TypeScript setup

### Known Issues
- NPM reports 21 vulnerabilities (3 low, 12 moderate, 4 high, 2 critical) that need attention
- Several deprecated packages need updating (uuid@3.3.3, request@2.88.2, phin@2.9.3, har-validator@5.1.3)
