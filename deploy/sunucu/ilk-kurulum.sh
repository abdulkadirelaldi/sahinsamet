#!/usr/bin/env bash
# İLK KURULUM — SUNUCUDA, root olarak, BİR KEZ çalışır (README → Yayına alma).
#
#   # geliştirme makinesinde, depo kökünde:
#   S=$(cat ~/.config/sahinsamet/sunucu)
#   scp deploy/sunucu/{docker-compose.yml,yedek-yerel.sh,nginx-sahinsamet.com.conf,ilk-kurulum.sh} "$S":/tmp/
#   ssh "$S" 'bash /tmp/ilk-kurulum.sh panel-eposta@ornek.com'
#
# Yaptığı: /opt/sahinsamet dizini, sırları SUNUCUDA üretilen .env (ekrana basılmaz), compose ve
# yedek betiği, nginx site dosyası (yalnızca HTTP; HTTPS'i certbot ekler). Sunucudaki diğer
# sitelere dokunmaz. .env zaten varsa hiçbir şey yapmadan durur: sırların üzerine yazmak 2FA'yı ve
# yedekleri açılamaz hâle getirirdi.
set -euo pipefail

EPOSTA=${1:?Kullanım: ilk-kurulum.sh panel-eposta@ornek.com}
DIZIN=/opt/sahinsamet
SITE=/etc/nginx/sites-available/sahinsamet.com

if [ -e "$DIZIN/.env" ]; then
  echo "$DIZIN/.env zaten var — kurulum daha önce yapılmış, hiçbir şey değiştirilmedi." >&2
  exit 1
fi
for dosya in docker-compose.yml yedek-yerel.sh nginx-sahinsamet.com.conf; do
  [ -f "/tmp/$dosya" ] || { echo "/tmp/$dosya yok: önce scp ile gönderin." >&2; exit 1; }
done

mkdir -p "$DIZIN/yedek"
chmod 700 "$DIZIN/yedek"
install -m 644 /tmp/docker-compose.yml "$DIZIN/docker-compose.yml"
install -m 755 /tmp/yedek-yerel.sh "$DIZIN/yedek-yerel.sh"

# Veritabanı şifresi yalnızca harf ve rakam: bağlantı adresine (DATABASE_URL) kaçışsız girer.
umask 077
cat > "$DIZIN/.env" <<ENV
POSTGRES_USER=sahinsamet
POSTGRES_PASSWORD=$(openssl rand -hex 24)
POSTGRES_DB=sahinsamet
NEXT_PUBLIC_SITE_URL=https://sahinsamet.com
AUTH_SECRET=$(openssl rand -base64 32)
TOTP_ENCRYPTION_KEY=$(openssl rand -base64 32)
TOTP_ISSUER='SŞ Panel'
ADMIN_EMAIL=$EPOSTA
ADMIN_NAME='Samet Şahin'
BACKUP_ENCRYPTION_KEY=$(openssl rand -base64 32)
ENV
umask 022

if [ -e "$SITE" ]; then
  echo "$SITE zaten var — nginx dosyasına dokunulmadı."
else
  install -m 644 /tmp/nginx-sahinsamet.com.conf "$SITE"
  ln -sf "$SITE" /etc/nginx/sites-enabled/sahinsamet.com
fi
nginx -t
systemctl reload nginx

rm -f /tmp/docker-compose.yml /tmp/yedek-yerel.sh /tmp/nginx-sahinsamet.com.conf
echo
echo "Tamam: $DIZIN hazır, nginx sahinsamet.com için HTTP dinliyor."
echo "ÖNEMLİ: $DIZIN/.env içindeki TOTP_ENCRYPTION_KEY ve BACKUP_ENCRYPTION_KEY'i parola"
echo "yöneticinize kopyalayın (kaybolursa 2FA ve yedekler açılamaz):  cat $DIZIN/.env"
echo "Sonraki adım (DNS yayıldıktan sonra): certbot --nginx -d sahinsamet.com -d www.sahinsamet.com"
