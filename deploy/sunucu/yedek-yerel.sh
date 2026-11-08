#!/usr/bin/env bash
# Gece yedeği — SUNUCU DİSKİNE, R2 olmadan (bkz. docs/yayin-nginx.md §Yedek).
#
# R2 yedek bucket'ı tanımlanana kadar köprü: veritabanı her gece `pg_dump`
# (özel biçim, sıkıştırılmış) ile alınır, 14 gün saklanır. Aynı diskte durduğu
# için disk arızasına karşı KORUMAZ — yalnızca hatalı silme/güncellemeye karşı.
# R2 yedeği (`scripts/yedek-al.ts`, şifreli, sunucu dışında) kurulunca bu
# betik yine de kalabilir: hızlı geri dönüş için yerel kopya.
#
# cron (root): 15 3 * * * /opt/sahinsamet/yedek-yerel.sh >> /var/log/sahinsamet-yedek.log 2>&1
set -euo pipefail

KOK=/opt/sahinsamet
HEDEF="$KOK/yedek"
SAKLA_GUN=14
mkdir -p "$HEDEF"
chmod 700 "$HEDEF"

cd "$KOK"
DOSYA="$HEDEF/sahinsamet-$(date +%Y-%m-%d).dump"

# Kimlik bilgisi konteynerin kendi ortamından — betikte sır yok.
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$DOSYA.tmp"
mv "$DOSYA.tmp" "$DOSYA"
chmod 600 "$DOSYA"

find "$HEDEF" -name 'sahinsamet-*.dump' -mtime +"$SAKLA_GUN" -delete
echo "[yedek] $(date -Is) $(du -h "$DOSYA" | cut -f1) $DOSYA"
