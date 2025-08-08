#!/bin/bash

# Script to safely delete the old /root/sancho-app directory on VPS
# Run this on your VPS: ssh root@168.231.67.221

VPS_IP="168.231.67.221"
OLD_PATH="/root/sancho-app"
NEW_PATH="/etc/dokploy/sancho-app"

echo "=================================================="
echo "CLEANUP: Removing old directory /root/sancho-app"
echo "=================================================="

# First, let's check what's currently running
echo "1. Checking current containers..."
docker ps --filter "name=sancho" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "2. Checking if old directory exists..."
if [ -d "$OLD_PATH" ]; then
    echo "✅ Old directory $OLD_PATH exists"
    echo "📁 Directory size:"
    du -sh $OLD_PATH
    echo ""
    echo "📋 Contents:"
    ls -la $OLD_PATH
else
    echo "❌ Old directory $OLD_PATH does not exist"
    exit 0
fi

echo ""
echo "3. Checking if new directory exists..."
if [ -d "$NEW_PATH" ]; then
    echo "✅ New directory $NEW_PATH exists"
    echo "📁 Directory size:"
    du -sh $NEW_PATH
else
    echo "❌ New directory $NEW_PATH does not exist!"
    echo "🚨 WARNING: Make sure the new location is properly set up before deleting the old one"
    exit 1
fi

echo ""
echo "4. Checking if containers are running from new location..."
echo "🔍 Checking container mount points..."
docker inspect sancho_backend_v2 2>/dev/null | grep -A 10 '"Mounts"' || echo "❌ Backend container not found"
docker inspect sancho_frontend_v2 2>/dev/null | grep -A 10 '"Mounts"' || echo "❌ Frontend container not found"

echo ""
echo "5. Creating backup before deletion..."
BACKUP_PATH="/tmp/sancho-app-backup-$(date +%Y%m%d_%H%M%S)"
echo "📦 Creating backup at $BACKUP_PATH"
cp -r $OLD_PATH $BACKUP_PATH
echo "✅ Backup created successfully"

echo ""
echo "6. Ready to delete old directory..."
echo "🗑️  About to delete: $OLD_PATH"
echo "💾 Backup location: $BACKUP_PATH"
echo "🎯 Active location: $NEW_PATH"

read -p "Are you sure you want to delete $OLD_PATH? (yes/no): " confirmation

if [ "$confirmation" = "yes" ]; then
    echo "🚀 Deleting old directory..."
    rm -rf $OLD_PATH
    echo "✅ Successfully deleted $OLD_PATH"
    
    echo ""
    echo "7. Verification..."
    if [ ! -d "$OLD_PATH" ]; then
        echo "✅ Confirmed: $OLD_PATH has been deleted"
    else
        echo "❌ Error: $OLD_PATH still exists"
    fi
    
    echo ""
    echo "📊 Final status:"
    echo "❌ Old location: $OLD_PATH (deleted)"
    echo "✅ New location: $NEW_PATH (active)"
    echo "💾 Backup: $BACKUP_PATH"
    
else
    echo "❌ Deletion cancelled"
    echo "💾 Backup remains at: $BACKUP_PATH"
fi

echo ""
echo "=================================================="
echo "CLEANUP COMPLETED"
echo "=================================================="
