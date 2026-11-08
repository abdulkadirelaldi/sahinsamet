#!/usr/bin/env bash
# yedek-cek.sh'ı bu Mac'te günlük launchd görevi olarak kurar (BİR KEZ çalıştırılır).
# Betik ~/Yedekler/sahinsamet'e kopyalanır: macOS arka plan görevlerinin Masaüstü'ne
# erişimini engelleyebilir. Kaldırmak: launchctl bootout gui/$(id -u)/com.sahinsamet.yedek-cek
set -euo pipefail
ETIKET=com.sahinsamet.yedek-cek
KLASOR="$HOME/Yedekler/sahinsamet"
mkdir -p "$KLASOR"
cp "$(dirname "$0")/yedek-cek.sh" "$KLASOR/yedek-cek.sh"
P="$HOME/Library/LaunchAgents/$ETIKET.plist"
cat > "$P" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$ETIKET</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$KLASOR/yedek-cek.sh</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>10</integer><key>Minute</key><integer>0</integer></dict>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$KLASOR/yedek-cek.log</string>
  <key>StandardErrorPath</key><string>$KLASOR/yedek-cek.log</string>
</dict>
</plist>
PLIST
launchctl bootout "gui/$(id -u)/$ETIKET" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$P"
echo "Kuruldu — her gün 10:00'da (Mac kapalıysa açılınca). Günlük: ~/Yedekler/sahinsamet/yedek-cek.log"
