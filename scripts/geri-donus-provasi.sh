#!/usr/bin/env bash
# YEDEKTEN GERİ DÖNÜŞ PROVASI (2026-11-02). Yedeğin içindekiler listesinin okunması geri
# dönüleceğini göstermez: yedek alınır, boş veritabanına açılır, tablo tablo sayılır.
#
#   PG_ARAC="docker exec -i sahinsamet-db-dev" PG_KULLANICI=sahinsamet PG_VERITABANI=sahinsamet \
#     bash scripts/geri-donus-provasi.sh
#
# Asıl veritabanına yazmaz; geçici `zz_prova` açıp siler. CI'da her koşuda çalışır.
set -euo pipefail

: "${PG_ARAC:?PG_ARAC gerekli: pg_dump ve psql çalıştıran komut öneki}"
: "${PG_KULLANICI:?}"
: "${PG_VERITABANI:?}"
PROVA=zz_prova
DOSYA=$(mktemp)
sql() { $PG_ARAC psql -U "$PG_KULLANICI" -v ON_ERROR_STOP=1 -tA "$@"; }
temizle() {
  rm -f "$DOSYA"
  sql -d "$PG_VERITABANI" -c "DROP DATABASE IF EXISTS $PROVA" >/dev/null 2>&1 || true
}
trap temizle EXIT

# Tablo başına satır sayısı ve para sütunlarının toplamı: ondalık değer bozulursa da yakalanır.
ozet() {
  local db=$1 tablo
  for tablo in $(sql -d "$db" -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1"); do
    echo "$tablo $(sql -d "$db" -c "SELECT count(*) FROM \"$tablo\"")"
  done
  sql -d "$db" -c 'SELECT coalesce(sum(balance),0) FROM wallet_account'
  sql -d "$db" -c 'SELECT coalesce(sum("remainingAmount"),0) FROM wallet_debt'
}

$PG_ARAC pg_dump -U "$PG_KULLANICI" -d "$PG_VERITABANI" -Fc >"$DOSYA"
sql -d "$PG_VERITABANI" -c "DROP DATABASE IF EXISTS $PROVA" >/dev/null
sql -d "$PG_VERITABANI" -c "CREATE DATABASE $PROVA" >/dev/null
$PG_ARAC pg_restore -U "$PG_KULLANICI" -d "$PROVA" --no-owner --exit-on-error <"$DOSYA"

asil=$(ozet "$PG_VERITABANI")
kopya=$(ozet "$PROVA")
if [ "$asil" != "$kopya" ]; then
  echo "[prova] YEDEK AYNI DEĞİL" >&2
  diff <(echo "$asil") <(echo "$kopya") >&2 || true
  exit 1
fi
echo "[prova] geri dönüldü: $(echo "$asil" | wc -l | tr -d ' ') satır özet birebir aynı, $(du -h "$DOSYA" | cut -f1)"
