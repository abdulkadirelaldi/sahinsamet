#!/usr/bin/env bash
# PR'ı birleştirip yayınlar — GELİŞTİRME MAKİNESİNDE, ayrı bir çalışma kopyasından.
#
#   deploy/sunucu/pr-yayinla.sh 123
#
# Oturumdan bağımsızdır: kendini arka plana alır, günlük ~/Library/Logs/sahinsamet-yayin.log.
# YENİDEN ÇALIŞTIRILABİLİR: Mac kapanır ya da bağlantı koparsa aynı komut kaldığı yerden sürer;
# PR zaten birleştiyse doğrudan yayına geçer, aynı sürüm yeniden yayınlansa da zarar vermez.
# Geçici çalışma kopyası iş bitince silinir, ana klasör başka dalda çalışmaya devam edebilir.
set -uo pipefail

n=${1:?Kullanım: pr-yayinla.sh PR_NUMARASI}
GUNLUK="$HOME/Library/Logs/sahinsamet-yayin.log"
BURASI="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

if [ "${SAHINSAMET_ARKADA:-}" != 1 ]; then
  # launchd işi (2026-11-17): `nohup … &` başlatan oturumun süreç grubunda kalıyor, oturum
  # kapanınca SIGTERM alıp yarıda kalabiliyordu (aelaldi #119'da ölçüldü). Tek seferlik iş.
  ETIKET="com.sahinsamet.yayin.$n"
  PLIST="$HOME/Library/LaunchAgents/$ETIKET.plist"
  mkdir -p "$HOME/Library/LaunchAgents" "$(dirname "$GUNLUK")"
  cat >"$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$ETIKET</string>
  <key>ProgramArguments</key><array>
    <string>/usr/bin/caffeinate</string><string>-i</string>
    <string>/bin/bash</string><string>$BURASI</string><string>$n</string>
  </array>
  <key>EnvironmentVariables</key><dict>
    <key>SAHINSAMET_ARKADA</key><string>1</string>
    <key>PATH</key><string>$PATH</string>
    <key>HOME</key><string>$HOME</string>
  </dict>
  <key>WorkingDirectory</key><string>$(pwd)</string>
  <key>StandardOutPath</key><string>$GUNLUK</string>
  <key>StandardErrorPath</key><string>$GUNLUK</string>
  <key>RunAtLoad</key><true/>
</dict></plist>
PLIST
  launchctl bootout "gui/$(id -u)/$ETIKET" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$PLIST"
  echo "Arka planda başladı (launchd: $ETIKET). Günlük: $GUNLUK"
  exit 0
fi

ANA=$(git -C "$(dirname "$BURASI")" rev-parse --show-toplevel)
KOPYA=$(mktemp -d)/sahinsamet-yayin
temizle() {
  git -C "$ANA" worktree remove --force "$KOPYA" 2>/dev/null || true
  git -C "$ANA" worktree prune
}
trap temizle EXIT
cd "$ANA" || exit 1
echo "--- #$n $(date)"

if [ "$(gh pr view "$n" --json state -q .state)" != MERGED ]; then
  gh pr update-branch "$n" 2>&1 | tail -1
  sleep 30
  # En çok 90 dakika: kontrol hiç gelmezse sonsuza kadar beklenmez.
  for _ in $(seq 90); do
    cikti=$(gh pr checks "$n" 2>&1)
    if echo "$cikti" | grep -qE $'\t(fail|cancel)'; then
      echo "KIRMIZI #$n"
      echo "$cikti" | cut -f1,2
      exit 1
    fi
    # Kapı görünmeden birleştirme: hızlı işler bitince CI başlamamış olabilir.
    if echo "$cikti" | grep -qE $'^Kapı.*\tpass' && ! echo "$cikti" | grep -qE $'\t(pending|queued)'; then
      hazir=1
      break
    fi
    sleep 60
  done
  [ "${hazir:-}" = 1 ] || { echo "#$n kontrolleri 90 dakikada bitmedi"; exit 1; }
  gh pr merge "$n" --merge 2>&1 | tail -1
  sleep 10
  [ "$(gh pr view "$n" --json state -q .state)" = MERGED ] || { echo "#$n birleşmedi"; exit 1; }
fi

git fetch -q origin main
git worktree prune
# `main` ana klasörde açıksa ikinci kopya aynı dalda açılamaz; orada yayınlanır.
if [ "$(git rev-parse --abbrev-ref HEAD)" = main ]; then
  git pull -q --ff-only origin main || exit 1
  bash deploy/sunucu/gonder.sh
else
  # `-f`: elektrik kesintisinde silinemeyen eski kopya yeniden çalıştırmayı engellemesin.
  git worktree add -q -f "$KOPYA" main || exit 1
  (cd "$KOPYA" && git pull -q --ff-only origin main && bash deploy/sunucu/gonder.sh)
fi
rc=$?
echo "--- #$n bitti, çıkış=$rc $(date)"
rm -f "$HOME/Library/LaunchAgents/com.sahinsamet.yayin.$n.plist"
exit "$rc"
