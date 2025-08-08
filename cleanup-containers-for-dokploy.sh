#!/bin/bash

# Script to clean up existing containers before Dokploy deployment
# Run this on VPS: ssh root@168.231.67.221

echo "=============================================="
echo "CLEANUP: Removing existing containers for Dokploy"
echo "=============================================="

# List of container names that need to be stopped and removed
CONTAINERS=("sancho_traefik_v2" "sancho_backend_v2" "sancho_frontend_v2" "sancho_db_v2")

echo "1. Checking current container status..."
for container in "${CONTAINERS[@]}"; do
    if docker ps -a --format "table {{.Names}}\t{{.Status}}" | grep -q "$container"; then
        echo "✅ Found: $container"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "$container"
    else
        echo "❌ Not found: $container"
    fi
done

echo ""
echo "2. Creating backup of current deployment state..."
BACKUP_DIR="/tmp/dokploy-cleanup-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Save container info
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" > "$BACKUP_DIR/containers_before_cleanup.txt"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}" > "$BACKUP_DIR/images_before_cleanup.txt"

echo "📁 Backup saved to: $BACKUP_DIR"

echo ""
echo "3. Stopping existing containers..."
for container in "${CONTAINERS[@]}"; do
    if docker ps -q -f name="$container" | grep -q .; then
        echo "🛑 Stopping: $container"
        docker stop "$container"
    else
        echo "⏸️  Already stopped: $container"
    fi
done

echo ""
echo "4. Removing existing containers..."
for container in "${CONTAINERS[@]}"; do
    if docker ps -a -q -f name="$container" | grep -q .; then
        echo "🗑️  Removing: $container"
        docker rm "$container"
    else
        echo "✅ Already removed: $container"
    fi
done

echo ""
echo "5. Verification - checking that containers are gone..."
for container in "${CONTAINERS[@]}"; do
    if docker ps -a -q -f name="$container" | grep -q .; then
        echo "❌ ERROR: $container still exists!"
    else
        echo "✅ SUCCESS: $container removed"
    fi
done

echo ""
echo "6. Current system state:"
echo "📊 Running containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "📁 Docker volumes:"
docker volume ls | grep -E "(sancho|postgres|traefik)" || echo "No matching volumes found"

echo ""
echo "🌐 Docker networks:"
docker network ls | grep -E "(sancho|bridge)" || echo "No matching networks found"

echo ""
echo "=============================================="
echo "✅ CLEANUP COMPLETED"
echo "=============================================="
echo ""
echo "🚀 Ready for Dokploy deployment!"
echo "💾 Backup location: $BACKUP_DIR"
echo ""
echo "Now you can retry the Dokploy deployment."
echo "The container names will be available for reuse."
