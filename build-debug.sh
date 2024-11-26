#!/bin/bash
# Set environment variables for corporate certificate handling
export NODE_TLS_REJECT_UNAUTHORIZED=0
export NPM_CONFIG_STRICT_SSL=false
export REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt

# Show debug info
echo "=== Environment ==="
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Current directory: $(pwd)"

# Build the image with debug output
podman build --tls-verify=false \
  --security-opt label=disable \
  --build-arg NODE_TLS_REJECT_UNAUTHORIZED=0 \
  --build-arg NPM_CONFIG_STRICT_SSL=false \
  --build-arg REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt \
  -f Dockerfile \
  -t trilium-debug . 2>&1 | tee build.log

# If build fails, highlight the error
if [ $? -ne 0 ]; then
    echo -e "\n\n=== Build failed! Last few lines of output: ==="
    tail -n 20 build.log
    
    # Show the last successful layer for debugging
    echo -e "\n=== Last successful layer: ==="
    podman images --filter "dangling=true" --format "{{.ID}} {{.CreatedAt}}" | sort -k2 | tail -n 1
    
    echo -e "\n=== NPM Debug Info ==="
    cat ~/.npm/_logs/$(ls -t ~/.npm/_logs | head -n1) || echo "No NPM logs found"
fi
