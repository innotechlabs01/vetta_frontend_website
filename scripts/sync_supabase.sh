#!/bin/bash
# Supabase Sync Script
# Sincroniza el proyecto origen a Docker local cada semana

set -e

ORIGIN_PROJECT="ldvtazoxloqdystdvbnq"
ORIGIN_PASSWORD="mLemouw176***"
BACKUP_DIR="/tmp/supabase_sync"
SCHEMA_FILE="$BACKUP_DIR/schema_$(date +%Y%m%d).sql"
DATA_FILE="$BACKUP_DIR/data_$(date +%Y%m%d).sql"
LOG_FILE="$BACKUP_DIR/sync.log"

echo "=== Supabase Sync $(date) ===" | tee -a $LOG_FILE

mkdir -p $BACKUP_DIR

cd /Users/frg/Documents/GreenStudio/cf-re-app

echo "1. Starting local Supabase..." | tee -a $LOG_FILE
supabase start 2>&1 | tee -a $LOG_FILE || true
sleep 10

echo "2. Linking to origin project..." | tee -a $LOG_FILE
supabase link --project-ref $ORIGIN_PROJECT --password "$ORIGIN_PASSWORD" 2>&1 | tee -a $LOG_FILE

echo "3. Dumping schema..." | tee -a $LOG_FILE
supabase db dump -f $SCHEMA_FILE 2>&1 | tee -a $LOG_FILE

echo "4. Dumping data..." | tee -a $LOG_FILE
supabase db dump --data-only -f $DATA_FILE 2>&1 | tee -a $LOG_FILE

echo "5. Cleaning local database..." | tee -a $LOG_FILE
docker exec supabase_db_cf-re-app psql -U postgres -d postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>&1 | tee -a $LOG_FILE

echo "6. Applying schema..." | tee -a $LOG_FILE
docker exec -i supabase_db_cf-re-app psql -U postgres -d postgres < $SCHEMA_FILE 2>&1 | tee -a $LOG_FILE

echo "7. Applying data..." | tee -a $LOG_FILE
docker exec -i supabase_db_cf-re-app psql -U postgres -d postgres < $DATA_FILE 2>&1 | tee -a $LOG_FILE

echo "8. Verifying..." | tee -a $LOG_FILE
TABLE_COUNT=$(docker exec supabase_db_cf-re-app psql -U postgres -d postgres -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
echo "   Tables: $TABLE_COUNT" | tee -a $LOG_FILE

echo "=== Sync Complete ===" | tee -a $LOG_FILE
