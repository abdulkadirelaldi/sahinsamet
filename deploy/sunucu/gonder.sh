#!/usr/bin/env bash
# Yeni sürümü yayına al — GELİŞTİRME MAKİNESİNDE çalışır (bkz. docs/yayin-nginx.md).
#
#   deploy/sunucu/gonder.sh            # GitHub'da derle + gönder + göç + yeniden başlat
#   YEREL=1 deploy/sunucu/gonder.sh    # yedek yol: bu Mac'te QEMU ile derle (yavaş)
#   ACIL=1  deploy/sunucu/gonder.sh    # CI kapısını atla: yalnızca canlı acil düzeltmesinde
#
# 1. İki imaj linux/amd64 için GitHub Actions'ta derlenir (.github/workflows/imaj.yml;
#    benzetim yok, katman önbelleği var). Sunucuda derlenmez: 1 CPU, orada
#    derlemek müşteri sitelerini dakikalarca yavaşlatırdı.
# 2. `docker load` ssh üzerinden — kayıt defteri (registry) yok, GitHub'ın
#    sunucuya hiçbir erişimi yok.
# 3. Sunucuda `goc` göçleri uygular, `uygulama` yeni imajla kalkar.
#    Kesinti: konteynerin yeniden başlama süresi (birkaç saniye).
set -euo pipefail

# Hedef depoda değil, bu makinede: ~/.config/sahinsamet/sunucu (içinde `kullanıcı@adres`) ya da $SUNUCU.
SUNUCU=${SUNUCU:-$(cat "$HOME/.config/sahinsamet/sunucu" 2>/dev/null || true)}
[ -n "$SUNUCU" ] || { echo "Sunucu adresi yok: ~/.config/sahinsamet/sunucu dosyasını oluşturun." >&2; exit 1; }
SITE_URL=${SITE_URL:-https://sahinsamet.com}
# Bağlantı canlı mı diye 30 sn'de bir yoklanır; 2 dakika yanıt yoksa ssh hata verir.
# Yoklama yokken gönderim sırasında Mac ağ değiştirince ssh ölü bağlantıyı
# sonsuza kadar bekledi (2026-11-01: 1 saat 40 dakika, hata vermeden).
SSH_SECENEK=(-o ServerAliveInterval=30 -o ServerAliveCountMax=4)
cd "$(dirname "$0")/../.."

if [ -n "$(git status --porcelain -- src prisma scripts package.json pnpm-lock.yaml Dockerfile)" ]; then
  echo "Kaydedilmemiş değişiklik var — yayına yalnızca commit'lenmiş kod çıkar." >&2
  exit 1
fi
SURUM=$(git rev-parse --short=9 HEAD)

# CI KAPISI (2026-11-02): yalnızca main'de ve CI'ı yeşil commit yayına çıkar. İki yeşil PR
# birleşince main kırmızı olabilir; dal ya da kırmızı commit canlıya gidemez. CI sürüyorsa beklenir.
# Haftalık zamanlanmış koşu aynı commit'te Kapı'yı atlar (`skipped`): sonuç sayılmaz, push koşusu okunur.
if [ "${ACIL:-}" != 1 ]; then
  [ "$(git rev-parse --abbrev-ref HEAD)" = main ] || { echo "Yalnızca main yayınlanır." >&2; exit 1; }
  git fetch -q origin main
  ISTENEN=$(git rev-parse HEAD)
  [ "$ISTENEN" = "$(git rev-parse origin/main)" ] || { echo "HEAD origin/main değil." >&2; exit 1; }
  for _ in $(seq 60); do
    KAPI=$(gh api "repos/{owner}/{repo}/commits/$ISTENEN/check-runs?per_page=100&filter=all" \
      -q '[.check_runs[] | select((.name | startswith("Kapı")) and .conclusion != "skipped")][0] | "\(.status) \(.conclusion)"' || true)
    case "$KAPI" in
      "completed success") break ;;
      "completed "*) echo "CI kırmızı ($KAPI): yayın durduruldu." >&2; exit 1 ;;
    esac
    echo "[gonder] CI bekleniyor: ${KAPI:-başlamadı}"
    sleep 30
  done
  [ "$KAPI" = "completed success" ] || { echo "CI 30 dakikada bitmedi: yayın durduruldu." >&2; exit 1; }
else
  echo "[gonder] ⚠️ ACIL=1: CI kapısı atlandı." >&2
fi

if [ "${YEREL:-}" = 1 ]; then
  for hedef in uygulama araclar; do
    docker buildx build --platform linux/amd64 --target "$hedef" \
      --build-arg NEXT_PUBLIC_SITE_URL="$SITE_URL" \
      -t "sahinsamet-$hedef:$SURUM" -t "sahinsamet-$hedef:latest" --load .
  done
  docker save "sahinsamet-uygulama:$SURUM" "sahinsamet-uygulama:latest" \
    "sahinsamet-araclar:$SURUM" "sahinsamet-araclar:latest" | gzip -1 | ssh "${SSH_SECENEK[@]}" "$SUNUCU" 'gunzip | docker load'
else
  # GitHub yalnızca İTİLMİŞ commit'i derleyebilir.
  DAL=$(git rev-parse --abbrev-ref HEAD)
  git fetch -q origin "$DAL"
  if [ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/$DAL")" ]; then
    echo "HEAD origin/$DAL ile aynı değil — önce git push." >&2
    exit 1
  fi
  SHA=$(git rev-parse HEAD)
  bul() {
    gh run list --workflow imaj.yml --branch "$DAL" --limit 20 \
      --json databaseId,headSha,conclusion,status \
      -q "[.[] | select(.headSha == \"$SHA\") | select($1)][0].databaseId // empty"
  }
  # Bu commit zaten derlendiyse yeniden derleme.
  KOSU=$(bul '.conclusion == "success"')
  if [ -z "$KOSU" ]; then
    gh workflow run imaj.yml --ref "$DAL"
    for _ in $(seq 30); do
      KOSU=$(bul '.status != "completed"')
      [ -n "$KOSU" ] && break
      sleep 4
    done
    [ -n "$KOSU" ] || { echo "Tetiklenen koşu bulunamadı." >&2; exit 1; }
    echo "[gonder] derleniyor: $(gh run view "$KOSU" --json url -q .url)"
    gh run watch "$KOSU" --exit-status --interval 15 >/dev/null
  fi
  # Yapıt (~500 MB) diske İNDİRİLMEDEN akıtılıyor: zip → bsdtar → ssh. Diski
  # dolu bir geliştirme makinesinde `gh run download` yarıda kalıyordu
  # (2026-10-26). Zip sıkıştırmasız (imaj.yml: compression-level 0); bsdtar
  # boyutu baştan bilinmeyen kaydı da akış halinde okuyabiliyor, funzip okuyamıyor.
  YAPIT=$(gh api "repos/{owner}/{repo}/actions/runs/$KOSU/artifacts" \
    -q ".artifacts[] | select(.name == \"imajlar-$SURUM\") | .id")
  [ -n "$YAPIT" ] || { echo "Yapıt bulunamadı: imajlar-$SURUM" >&2; exit 1; }
  # Yapıtı SUNUCU doğrudan GitHub'dan indirir (2026-10-28). Önce imaj Mac
  # üzerinden akıyordu: ev bağlantısının YÜKLEME hızı (bir gün ~1,7 MB/sn, ertesi
  # gün ~70 KB/sn) gönderimi 5 dakikadan 2 saate çıkarabiliyordu. Sunucuya
  # kalıcı jeton KONMUYOR: GitHub yapıt adresi, ~1 dakika geçerli ve yalnızca bu
  # dosyayı okuyan imzalı bir adrese yönlendiriyor; o adres ssh'ın standart
  # girdisinden geçiyor (Mac'te komut satırında görünmez). Sunucuda unzip yok,
  # zip python3 ile açılıyor. 60 sn boyunca 10 KB/sn altına düşen indirme
  # kesilir ve zincir hata verir — eksik imaj yüklenmez, canlı sürüm değişmez.
  DEPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
  IMZALI=$(printf 'header = "Authorization: Bearer %s"\n' "$(gh auth token)" \
    | curl -fsS -K - -o /dev/null -w '%{redirect_url}' \
      "https://api.github.com/repos/$DEPO/actions/artifacts/$YAPIT/zip")
  [ -n "$IMZALI" ] || { echo "Yapıt indirme adresi alınamadı." >&2; exit 1; }
  printf '%s' "$IMZALI" | ssh "${SSH_SECENEK[@]}" "$SUNUCU" 'set -euo pipefail
    adres=$(cat)
    zip=$(mktemp /tmp/sahinsamet-imaj.XXXXXX)
    trap "rm -f \"$zip\"" EXIT
    curl -fsSL --speed-limit 10240 --speed-time 60 -o "$zip" "$adres"
    python3 -c "import shutil, sys, zipfile; shutil.copyfileobj(zipfile.ZipFile(sys.argv[1]).open(\"imajlar.tar.gz\"), sys.stdout.buffer)" "$zip" \
      | gunzip | docker load'
fi

# Göç öncesi yedek: göç geri alınamaz; dosya gece yedeğinden bağımsız ve 7 gün durur. Yedek
# alınamazsa yayın burada durur, canlı değişmez. `db` önce kaldırılır: ilk yayında henüz hiç
# konteyner yoktu ve `exec` "service db is not running" ile düştü (2026-11-09). Çalışıyorsa
# `up -d db` hiçbir şeye dokunmaz; `--wait` sağlık kontrolü geçene kadar bekler.
ssh "${SSH_SECENEK[@]}" "$SUNUCU" "umask 077; cd /opt/sahinsamet && mkdir -p yedek && \
  docker compose up -d --wait db && \
  docker compose exec -T db sh -c 'pg_dump -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -Fc' > yedek/goc-oncesi-$SURUM.tmp && \
  mv yedek/goc-oncesi-$SURUM.tmp yedek/goc-oncesi-$SURUM.dump && \
  find yedek -name 'goc-oncesi-*' -mtime +7 -delete || { rm -f yedek/goc-oncesi-$SURUM.tmp; exit 1; }"

# Eski sürümler: güncel + bir önceki (geri dönüş için) kalır, gerisi silinir.
# Her sürüm ~2,6 GB; disk müşteri siteleri ve mailcow ile paylaşılıyor.
# `up` başarısızsa (göç düştüyse) yayın başarısızdır; temizlik hatası değildir.
IMAJ_ONCE=$(ssh "${SSH_SECENEK[@]}" "$SUNUCU" "docker inspect -f '{{.Image}}' sahinsamet-uygulama-1 2>/dev/null || true")
ssh "${SSH_SECENEK[@]}" "$SUNUCU" "cd /opt/sahinsamet && docker compose up -d --remove-orphans"
IMAJ_SONRA=$(ssh "${SSH_SECENEK[@]}" "$SUNUCU" "docker inspect -f '{{.Image}}' sahinsamet-uygulama-1")
ssh "${SSH_SECENEK[@]}" "$SUNUCU" "for r in sahinsamet-uygulama sahinsamet-araclar; do \
    docker images \$r --format '{{.Tag}}' | grep -vx latest | tail -n +3 | xargs -r -I{} docker rmi \$r:{} >/dev/null; \
  done; docker image prune -f >/dev/null" || echo "[gonder] ⚠️ eski imajlar temizlenemedi" >&2

# Yeni süreç gerçekten kalktı mı: imaj değiştiyse `uptime` küçük olmalı (eski süreç de `ok` döner),
# aynı sürüm yeniden yayınlandıysa süreç değişmez. Kalkmadıysa "yayında" denmez; betik hata verir.
UPTIME_SINIRI=300
[ "$IMAJ_ONCE" != "$IMAJ_SONRA" ] || UPTIME_SINIRI=100000000
for _ in $(seq 30); do
  SAGLIK=$(curl -fsS --max-time 8 "$SITE_URL/api/v1/health" || true)
  if python3 -c "import json, sys; d = json.loads(sys.argv[1])['data']; sys.exit(0 if d['db'] == 'up' and d['uptime'] < float(sys.argv[2]) else 1)" "$SAGLIK" "$UPTIME_SINIRI" 2>/dev/null; then
    echo "[gonder] $SURUM yayında: $SAGLIK"
    exit 0
  fi
  sleep 5
done
echo "[gonder] $SURUM YAYINA ÇIKMADI: 150 sn içinde yeni süreç sağlıklı yanıt vermedi." >&2
exit 1
