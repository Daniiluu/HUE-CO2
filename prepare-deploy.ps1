# prepare-deploy.ps1
# Script de automatización para empaquetar y preparar el despliegue en Vaport (cPanel)

Clear-Host
Write-Host "=== HUE-CO2: PREPARADOR DE DESPLIEGUE (VAPORT) ===" -ForegroundColor Cyan
Write-Host "Este script compilara el frontend y generara un ZIP optimizado para tu hosting." -ForegroundColor Gray
Write-Host ""

# 1. Definir rutas absolutas garantizadas al inicio
$projectRoot = (Get-Location).Path
$tempDir     = "$projectRoot\deploy_temp"
$zipFile     = "$projectRoot\deploy-hueco2.zip"

Write-Host "Ruta del proyecto : $projectRoot" -ForegroundColor Gray
Write-Host "Carpeta temporal  : $tempDir"      -ForegroundColor Gray
Write-Host "Archivo de salida : $zipFile"      -ForegroundColor Gray
Write-Host ""

# 2. Compilar Assets del Frontend (React/Vite)
Write-Host "[1/4] Compilando assets de React y Vite..." -ForegroundColor Yellow

$buildSuccess  = $false
$containerName = "hueco2-laravel.test-1"

$dockerCheck = & docker ps --filter "name=$containerName" --format "{{.Names}}" 2>$null
if ($dockerCheck -match $containerName) {
    Write-Host "  Contenedor Docker detectado. Compilando dentro del contenedor..." -ForegroundColor Gray
    & docker exec $containerName npm run build
    if ($LASTEXITCODE -eq 0) { $buildSuccess = $true }
}

if (-not $buildSuccess) {
    Write-Host "  Docker no disponible. Intentando compilar localmente..." -ForegroundColor Gray
    & npm run build 2>$null
    if ($LASTEXITCODE -eq 0) { $buildSuccess = $true }
}

if (-not $buildSuccess) {
    Write-Host ""
    Write-Host "ERROR: No se pudo compilar el frontend." -ForegroundColor Red
    Write-Host "  -> Levanta Docker con 'npm run start' y vuelve a ejecutar este script." -ForegroundColor Yellow
    exit 1
}
Write-Host "  OK: Frontend compilado con exito." -ForegroundColor Green
Write-Host ""

# 3. Limpiar carpeta temporal si existe de una ejecucion anterior
if (Test-Path $tempDir) {
    Write-Host "  Limpiando carpeta temporal anterior..." -ForegroundColor Gray
    Remove-Item -Recurse -Force $tempDir
}
if (Test-Path $zipFile) {
    Write-Host "  Eliminando ZIP anterior..." -ForegroundColor Gray
    Remove-Item -Force $zipFile
}

# 4. Copiar archivos con robocopy (excluye node_modules, vendor, .git)
Write-Host "[2/4] Copiando archivos del proyecto (excluye node_modules/vendor/.git)..." -ForegroundColor Yellow

robocopy $projectRoot $tempDir /E /NFL /NDL /NJH /NJS `
    /XD node_modules vendor .git deploy_temp scratch `
    /XF deploy-hueco2.zip .phpunit.result.cache cloudflare.log tunnel.log | Out-Null

# robocopy devuelve 0-7 como exito (8+ son errores)
if ($LASTEXITCODE -ge 8) {
    Write-Host "ERROR: robocopy fallo copiando los archivos (codigo: $LASTEXITCODE)." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $tempDir)) {
    Write-Host "ERROR: La carpeta temporal no fue creada. Verifica permisos." -ForegroundColor Red
    exit 1
}

# Vaciar el log de Laravel (pesa ~85 MB) y dejar el archivo vacio
$logFile = "$tempDir\storage\logs\laravel.log"
if (Test-Path $logFile) {
    Write-Host "  Vaciando laravel.log (archivo de depuracion pesado)..." -ForegroundColor Gray
    Clear-Content $logFile
}

Write-Host "  OK: Archivos copiados. Contenido de la carpeta temporal:" -ForegroundColor Green
Get-ChildItem $tempDir | Select-Object Name | Format-Table -HideTableHeaders
Write-Host ""

# 5. Comprimir la carpeta temporal en ZIP
Write-Host "[3/4] Comprimiendo en deploy-hueco2.zip..." -ForegroundColor Yellow

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipFile)

if (-not (Test-Path $zipFile)) {
    Write-Host "ERROR: El archivo ZIP no fue creado." -ForegroundColor Red
    exit 1
}
Write-Host "  OK: Compresion completada." -ForegroundColor Green
Write-Host ""

# 6. Eliminar carpeta temporal
Write-Host "[4/4] Limpiando carpeta temporal..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $tempDir
Write-Host "  OK: Limpieza completada." -ForegroundColor Green
Write-Host ""

$sizeMB = [math]::Round((Get-Item $zipFile).Length / 1MB, 2)
Write-Host "==================================================" -ForegroundColor Green
Write-Host "PROCESO COMPLETADO CON EXITO!" -ForegroundColor Green
Write-Host "Archivo : deploy-hueco2.zip"  -ForegroundColor Green
Write-Host "Ruta    : $zipFile"           -ForegroundColor Green
Write-Host "Tamano  : $sizeMB MB"         -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Pasos siguientes:" -ForegroundColor Cyan
Write-Host "  1. Sube deploy-hueco2.zip al Administrador de Archivos de cPanel (Vaport)." -ForegroundColor Gray
Write-Host "  2. Descomprimelo en /home/tu_usuario/ (FUERA de public_html)." -ForegroundColor Gray
Write-Host "  3. Mueve el contenido de la carpeta /public al interior de public_html." -ForegroundColor Gray
Write-Host "  4. Edita public_html/index.php para apuntar las rutas al proyecto." -ForegroundColor Gray
Write-Host "  5. Configura la BD y el .env segun la guia deployment_guide_vaport.md" -ForegroundColor Gray
Write-Host "==================================================" -ForegroundColor Green
