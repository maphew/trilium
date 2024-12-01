@echo off
REM Stop and remove existing container if it exists
podman stop notes-dev 2>nul
podman rm notes-dev 2>nul

REM Run the container with mounted volumes
podman run -d ^
    --name notes-dev ^
    -p 8080:8080 ^
    -v %CD%/src:/usr/src/app/src ^
    -v %CD%/libraries:/usr/src/app/libraries ^
    -v %CD%/package.json:/usr/src/app/package.json ^
    -v %CD%/package-lock.json:/usr/src/app/package-lock.json ^
    notes-dev

REM Show the logs
echo Container started. Showing logs...
podman logs -f notes-dev
