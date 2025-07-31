@echo off
echo ====================================
echo    DEPLOY MAESTRO INVENTARIO
echo ====================================

echo.
echo 1. Verificando Docker...
docker --version
if %errorlevel% neq 0 (
    echo ERROR: Docker no está instalado o no está en el PATH
    pause
    exit /b 1
)

echo.
echo 2. Verificando Docker está corriendo...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker no está corriendo. Inicia Docker Desktop primero.
    echo Presiona cualquier tecla después de iniciar Docker Desktop...
    pause
)

echo.
echo 3. Copiando archivo de entorno...
if not exist .env (
    copy .env.example .env
    echo ¡IMPORTANTE! Edita el archivo .env con tus datos reales antes de continuar.
    echo Presiona cualquier tecla cuando hayas editado .env...
    pause
)

echo.
echo 4. Deteniendo contenedores existentes...
docker-compose down -v 2>nul

echo.
echo 5. Limpiando imágenes antiguas...
docker system prune -f

echo.
echo 6. Construyendo imágenes (esto puede tomar varios minutos)...
docker-compose build --no-cache

echo.
echo 7. Iniciando servicios...
docker-compose up -d

echo.
echo 8. Esperando que los servicios estén listos...
timeout /t 10 /nobreak >nul

echo.
echo 9. Verificando estado de los servicios...
docker-compose ps

echo.
echo 10. Mostrando logs del backend...
docker-compose logs backend

echo.
echo ====================================
echo          DEPLOY COMPLETADO
echo ====================================
echo.
echo URLs de acceso:
echo - Frontend: http://localhost:5173
echo - Backend:  http://localhost:8030
echo - Admin:    http://localhost:8030/admin
echo.
echo Para ver logs en tiempo real:
echo   docker-compose logs -f
echo.
echo Para ejecutar migraciones (solo primera vez):
echo   docker-compose exec backend python manage.py migrate
echo   docker-compose exec backend python manage.py createsuperuser
echo.
pause
