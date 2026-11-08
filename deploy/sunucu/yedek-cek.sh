#!/usr/bin/env bash
# Sunucu DIŞI yedek — GELİŞTİRME MAKİNESİNDE çalışır (launchd, günde bir; bkz.
# docs/yayin-nginx.md §Yedek). Sunucudaki gece dökümlerini (yedek-yerel.sh)
# bu makineye çeker: sunucu diski giderse yedek de gitmesin.
#
# Mac kapalıysa launchd, uyanınca kaçırılan çalıştırmayı yapar. Her dosya
# `pg_restore --list` ile okunabilirliği sınanmadan saklanmaz — bozuk yedek
# yedek değildir. 60 gün saklanır.
set -euo pipefail

# Hedef depoda değil, bu makinede: ~/.config/sahinsamet/sunucu (içinde `kullanıcı@adres`) ya da $SUNUCU.
SUNUCU=${SUNUCU:-$(cat "$HOME/.config/sahinsamet/sunucu" 2>/dev/null || true)}
[ -n "$SUNUCU" ] || { echo "Sunucu adresi yok: ~/.config/sahinsamet/sunucu dosyasını oluşturun." >&2; exit 1; }
HEDEF=${HEDEF:-$HOME/Yedekler/sahinsamet}
SAKLA_GUN=60
mkdir -p "$HEDEF"
chmod 700 "$HEDEF"

rsync -a --ignore-existing -e 'ssh -o BatchMode=yes -o ConnectTimeout=20' \
  "$SUNUCU:/opt/sahinsamet/yedek/" "$HEDEF/"
chmod 600 "$HEDEF"/*.dump

SON=$(ls -1 "$HEDEF"/sahinsamet-*.dump | tail -1)
# Okunabilirlik sınaması sunucudaki pg_restore ile (Mac'te Postgres kurulu olmayabilir).
ssh -o BatchMode=yes "$SUNUCU" 'cd /opt/sahinsamet && docker compose exec -T db pg_restore --list' \
  < "$SON" > /dev/null
find "$HEDEF" -name 'sahinsamet-*.dump' -mtime +"$SAKLA_GUN" -delete
echo "[yedek-cek] $(date -Iseconds) $(ls -1 "$HEDEF"/*.dump | wc -l | tr -d ' ') dosya, son: $(basename "$SON") ✓"
