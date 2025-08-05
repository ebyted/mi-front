#!/usr/bin/env pwsh

# Script de despliegue simple para aplicar las correcciones de autenticación

Write-Host "=== Iniciando despliegue de correcciones de autenticación ===" -ForegroundColor Green

# Conexión al servidor
$server = "root@168.231.67.221"
$projectPath = "/root/mi-front"

Write-Host "Conectando al servidor y actualizando desde GitHub..." -ForegroundColor Yellow

# Comandos a ejecutar en el servidor
$commands = @(
    "cd $projectPath",
    "echo '=== Actualizando desde GitHub ==='",
    "git pull origin main",
    "echo '=== Reconstruyendo contenedor del frontend ==='", 
    "docker-compose -f docker-compose-fixed.yml stop frontend",
    "docker-compose -f docker-compose-fixed.yml build --no-cache frontend",
    "docker-compose -f docker-compose-fixed.yml up -d frontend",
    "echo '=== Verificando estado de contenedores ==='",
    "docker-compose -f docker-compose-fixed.yml ps",
    "echo '=== Despliegue completado ==='",
    "echo 'Puedes verificar en: https://www.sanchodistribuidora.com'"
)

$commandString = $commands -join " && "

Write-Host "Ejecutando comandos en el servidor..." -ForegroundColor Yellow
ssh $server $commandString

Write-Host "=== Despliegue completado ===" -ForegroundColor Green
Write-Host "Las correcciones de autenticación deberían estar activas ahora" -ForegroundColor Green
Write-Host "Verifica en: https://www.sanchodistribuidora.com" -ForegroundColor Cyan
