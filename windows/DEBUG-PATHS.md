# Debugging Path Issues in Windows Container Build

This guide focuses on debugging path-related issues that commonly occur between Windows host system and Linux containers during the build process.

## Common Path Issues

1. **Windows vs Container Path Separators**
   - Windows uses backslashes (`\`)
   - Container uses forward slashes (`/`)
   - **Debug Action**: Add path logging in PowerShell script
     ```powershell
     Write-Host "Build Directory: $($BuildDir -replace '\\', '/')"
     Write-Host "Project Root: $($ProjectRoot -replace '\\', '/')"
     ```

2. **Build Context Path Resolution**
   - Issue: Files not found during `COPY` operations
   - Common in multi-stage builds with parent directory context
   - **Debug Actions**:
     ```bash
     # Inside container during build
     find / -name "tsconfig*.json" 2>/dev/null
     ls -la /usr/src/app
     pwd
     ```

## Debugging Steps

### 1. PowerShell Environment Check
```powershell
# Add to build-and-run.ps1 before build
Write-Host "=== Environment Check ==="
Write-Host "PWD: $(Get-Location)"
Write-Host "Script Location: $PSScriptRoot"
Write-Host "Parent Directory: $(Get-Item $PSScriptRoot).Parent.FullName"
Get-ChildItem -Path "$PSScriptRoot" -Recurse | Select-Object FullName
```

### 2. Container Build Context Verification
Add to Dockerfile.build-1:
```dockerfile
# After each COPY command
RUN echo "=== Verifying Copy ===" && \
    ls -la ${APP_ROOT} && \
    find ${APP_ROOT} -type f -name "*.json" -o -name "*.ts"
```

### 3. TypeScript Path Resolution
```bash
# Add to Dockerfile.build-1
RUN echo "=== TypeScript Paths ===" && \
    node -e "console.log(require('./tsconfig.json').compilerOptions.paths)" && \
    node -e "console.log(require('./tsconfig.webpack.json').compilerOptions.paths)"
```

## Webpack and TypeScript Path Resolution

### Webpack Configuration Check
```javascript
// Add to webpack.config.ts for debugging
console.log('Webpack Config Debug:');
console.log('Project Root:', __dirname);
console.log('Asset Path:', require('./src/services/asset_path.js'));
console.log('Output Path:', path.resolve(__dirname, 'src/public/app-dist'));
```

### TypeScript Configuration Verification

1. **Webpack Build TypeScript**
   ```json
   {
     "compilerOptions": {
       "baseUrl": "..",        // Points to project root
       "outDir": "../dist"     // Output relative to windows/
     }
   }
   ```

2. **Server TypeScript**
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",         // Points to windows/
       "outDir": "dist"        // Output in windows/dist
     }
   }
   ```

### Path Resolution Debug Steps

1. **Verify TypeScript Paths**
   ```bash
   # Add to Dockerfile.build-1
   RUN echo "=== TypeScript Resolution ===" && \
       tsc --showConfig && \
       echo "=== Module Resolution ===" && \
       tsc --traceResolution
   ```

2. **Check Asset Path Resolution**
   ```javascript
   // Add to src/services/asset_path.js temporarily
   console.log('Asset Path Resolution:');
   console.log('Process CWD:', process.cwd());
   console.log('Module Path:', __dirname);
   console.log('Resolved Path:', /* actual resolved path */);
   ```

3. **Webpack Module Resolution**
   ```bash
   # Add to build command
   npm run webpack -- --config-name tsconfig.webpack.json --display-modules --display-error-details
   ```

## Build Process Debug Output Analysis

### TypeScript Module Resolution
The TypeScript module resolution tracing shows:
1. All node module dependencies are correctly resolved
2. Core Node.js modules (`http`, `https`, `stream`, `tls`) are properly handled
3. Type definitions are successfully loaded from `@types` packages

### Path Resolution Patterns
Common patterns in the debug output:
1. Module resolution follows Node.js resolution algorithm:
   - First tries relative to baseUrl
   - Then checks node_modules
   - Finally resolves from @types

2. TypeScript Configuration:
   ```typescript
   {
     "baseUrl": "..",        // For webpack build
     "outDir": "../dist"     // Output relative to windows/
   }
   ```

3. Module Import Patterns:
   ```typescript
   // Working patterns
   import * from '../index'
   import * from './classes/semver'
   
   // Potential issues
   import * from 'stream'  // Core module resolution
   ```

### Recommendations

1. **Path Consistency**
   - Use forward slashes (`/`) in all path specifications
   - Keep paths relative to project root when possible
   - Use `path.join()` for cross-platform compatibility

2. **Module Resolution**
   - Prefer explicit relative paths (`./` or `../`) for local imports
   - Use `baseUrl` and `paths` in tsconfig for module aliases
   - Ensure all core Node.js modules are properly typed

3. **Build Context**
   - Keep build context at project root
   - Use consistent path resolution in Dockerfile COPY commands
   - Maintain separation between build and runtime paths

4. **Debugging Steps**
   ```powershell
   # 1. Check TypeScript resolution
   tsc --traceResolution

   # 2. Verify module paths
   node -e "console.log(require.resolve.paths(''))"

   # 3. Test path resolution
   node -e "console.log(require.resolve('./path/to/module'))"
   ```

## Quick Debug Commands

### Host System (PowerShell)
```powershell
# Check file permissions and paths
Get-Acl .\tsconfig.server.json | Format-List
Get-ChildItem -Path . -Recurse | Where-Object {$_.Name -like "tsconfig*"}

# Verify symlinks and junctions
Get-ChildItem -Path . -Recurse | Where-Object {$_.LinkType} | Select-Object FullName,LinkType,Target
```

### Container (During Build)
```bash
# Add these commands to Dockerfile for debugging
RUN echo "=== File System State ===" && \
    df -h && \
    mount && \
    echo "=== File Permissions ===" && \
    ls -la ${APP_ROOT} && \
    echo "=== Node Configuration ===" && \
    node -e "console.log(process.env.NODE_PATH)" && \
    node -e "console.log(require.resolve.paths(''))"
```

## Common Solutions

1. **Path Normalization**
   ```powershell
   # In PowerShell script
   $NormalizedPath = $Path.Replace('\', '/').TrimEnd('/')
   ```

2. **Build Context Issues**
   - Always use relative paths from Dockerfile location
   - Verify context with:
     ```dockerfile
     RUN find . -type f -exec file {} \;
     ```

3. **TypeScript Path Mappings**
   - Ensure baseUrl is correctly set
   - Use absolute paths in tsconfig when needed
   - Verify module resolution:
     ```json
     {
       "compilerOptions": {
         "baseUrl": ".",
         "paths": {
           "@/*": ["src/*"]
         }
       }
     }
     ```

## Logging Levels

Add these environment variables for enhanced debugging:
```powershell
# In build-and-run.ps1
$env:DEBUG="*"
$env:NODE_DEBUG="module"
$env:TS_NODE_DEBUG="true"
```

## Verification Checklist

- [ ] PowerShell script paths are correctly normalized
- [ ] Build context includes all necessary files
- [ ] TypeScript configs are properly copied and resolved
- [ ] Node modules paths are correctly resolved
- [ ] File permissions are correct in container
- [ ] No path mapping conflicts between Windows and Linux paths

## Additional Resources

- Docker documentation on Windows containers
- TypeScript path resolution documentation
- Node.js path resolution algorithm
