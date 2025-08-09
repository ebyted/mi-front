#!/bin/bash
# Crear red externa para Traefik
docker network create web 2>/dev/null || echo "Red 'web' ya existe"
echo "Red 'web' configurada correctamente"
