# PowerShell script to delete old /root/sancho-app directory on VPS
# This script helps you connect to VPS and safely remove the old directory

$VPS_IP = "168.231.67.221"

Write-Host "=================================================="
Write-Host "CLEANUP: Delete old /root/sancho-app directory" -ForegroundColor Yellow
Write-Host "=================================================="

Write-Host ""
Write-Host "📋 Instructions to clean up old directory:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Connect to your VPS:" -ForegroundColor Cyan
Write-Host "   ssh root@$VPS_IP" -ForegroundColor White
Write-Host ""
Write-Host "2. Check if old directory exists:" -ForegroundColor Cyan
Write-Host "   ls -la /root/sancho-app" -ForegroundColor White
Write-Host ""
Write-Host "3. Verify new directory is working:" -ForegroundColor Cyan
Write-Host "   ls -la /etc/dokploy/sancho-app" -ForegroundColor White
Write-Host "   docker ps --filter 'name=sancho'" -ForegroundColor White
Write-Host ""
Write-Host "4. Create backup (recommended):" -ForegroundColor Cyan
Write-Host "   cp -r /root/sancho-app /tmp/sancho-app-backup-`$(Get-Date -Format 'yyyyMMdd')" -ForegroundColor White
Write-Host ""
Write-Host "5. Delete old directory:" -ForegroundColor Cyan
Write-Host "   rm -rf /root/sancho-app" -ForegroundColor White
Write-Host ""
Write-Host "6. Verify deletion:" -ForegroundColor Cyan
Write-Host "   ls -la /root/ | grep sancho" -ForegroundColor White
Write-Host ""

Write-Host "🚨 IMPORTANT SAFETY CHECKS:" -ForegroundColor Red
Write-Host "   ✅ Verify containers are running from /etc/dokploy/sancho-app" -ForegroundColor Yellow
Write-Host "   ✅ Verify website is working: https://www.sanchodistribuidora.com" -ForegroundColor Yellow
Write-Host "   ✅ Create backup before deletion" -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "Do you want to copy the cleanup script to VPS? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host ""
    Write-Host "📤 Copying cleanup script to VPS..." -ForegroundColor Green
    Write-Host "Command to run:" -ForegroundColor Cyan
    Write-Host "scp cleanup-old-directory.sh root@${VPS_IP}:/tmp/" -ForegroundColor White
    Write-Host ""
    Write-Host "Then on VPS run:" -ForegroundColor Cyan
    Write-Host "chmod +x /tmp/cleanup-old-directory.sh" -ForegroundColor White
    Write-Host "/tmp/cleanup-old-directory.sh" -ForegroundColor White
}

Write-Host ""
Write-Host "=================================================="
