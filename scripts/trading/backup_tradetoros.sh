#!/usr/bin/env bash
# ============================================================
# TRADETOROS SYSTEM BACKUP
# Saves: DB, configs, nginx, .env, app state
# ============================================================
set -euo pipefail

BACKUP_DIR="/root/backups/tradetoros"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="$BACKUP_DIR/tradetoros_$TIMESTAMP"

echo "=== TradeToros Backup: $TIMESTAMP ==="

mkdir -p "$BACKUP_PATH"

# 1. Backup SQLite database
if [ -f /opt/curio-crm/.data/store.sqlite ]; then
  cp /opt/curio-crm/.data/store.sqlite "$BACKUP_PATH/store.sqlite"
  echo "  DB backed up"
fi

# 2. Backup .env
if [ -f /opt/curio-crm/.env ]; then
  cp /opt/curio-crm/.env "$BACKUP_PATH/.env"
  echo "  .env backed up"
fi

# 3. Backup nginx config
cp /etc/nginx/sites-available/tradetoros "$BACKUP_PATH/nginx-tradetoros.conf" 2>/dev/null || true
echo "  Nginx config backed up"

# 4. Backup SSL
tar czf "$BACKUP_PATH/ssl.tar.gz" -C /etc/letsencrypt/live/tradetoros.com . 2>/dev/null || true
echo "  SSL backed up"

# 5. Snapshot PM2 status
pm2 show tradetoros-crm > "$BACKUP_PATH/pm2-status.txt" 2>/dev/null || true
pm2 list > "$BACKUP_PATH/pm2-list.txt" 2>/dev/null || true
echo "  PM2 status saved"

# 6. Snapshot process list
ps aux > "$BACKUP_PATH/process-list.txt" 2>/dev/null || true
echo "  Process list saved"

# 7. Create archive
cd "$BACKUP_DIR"
tar czf "tradetoros_$TIMESTAMP.tar.gz" "tradetoros_$TIMESTAMP"
rm -rf "tradetoros_$TIMESTAMP"

echo ""
echo "=== Backup complete: $BACKUP_DIR/tradetoros_$TIMESTAMP.tar.gz ==="
echo "Size: $(du -h "$BACKUP_DIR/tradetoros_$TIMESTAMP.tar.gz" | cut -f1)"

# Keep last 10 backups, remove older
ls -t "$BACKUP_DIR"/tradetoros_*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm
echo "Pruned old backups (keeping last 10)"
