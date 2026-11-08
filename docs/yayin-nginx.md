# Yayın — paylaşımlı sunucu (nginx + Docker)

sahinsamet.com, nginx'in önde durduğu **paylaşımlı** bir sunucuda çalışır
(sunucuda başka bir Next.js uygulaması, müşteri siteleri ve mailcow da var).
Sunucu adresi depoda değil, geliştirme makinesinde: `~/.config/sahinsamet/sunucu`
(içinde `kullanıcı@adres`) ya da `$SUNUCU` ortam değişkeni.

İlk kurulumun adım adım hâli README → **Yayına alma**'da. Bu belge yerleşimi
ve sonraki işletme adımlarını anlatır.

## Yalıtım — mevcut uygulamalarla hiçbir şey paylaşılmaz

| Ne | sahinsamet |
|---|---|
| Dizin | `/opt/sahinsamet/` (`docker-compose.yml`, `.env` chmod 600, `yedek/`) |
| Compose projesi | `name: sahinsamet` → konteynerler `sahinsamet-db-1`, `sahinsamet-goc-1`, `sahinsamet-uygulama-1`, `sahinsamet-araclar-1` |
| Birim / ağ | `sahinsamet_pgdata` / `sahinsamet_default` |
| İmajlar | `sahinsamet-uygulama`, `sahinsamet-araclar` |
| Uygulama portu | **yalnızca** `127.0.0.1:3410` (3400 başka bir uygulamanın) |
| Veritabanı | kendi Postgres konteyneri, port dışarı kapalı |
| nginx | `/etc/nginx/sites-available/sahinsamet.com` (depoda `deploy/sunucu/nginx-sahinsamet.com.conf`) |
| Sertifika | `/etc/letsencrypt/live/sahinsamet.com/` — certbot otomatik yeniler |
| Yerel yedek | `/opt/sahinsamet/yedek/` — cron, `/var/log/sahinsamet-yedek.log` |
| Mac'e yedek çekme | `~/Yedekler/sahinsamet/`, launchd etiketi `com.sahinsamet.yedek-cek` |

Sunucu genelindeki ayarlar (SSH sıkılaştırma, nginx `server_tokens`) bu
projenin işi değildir ve bu depodan değiştirilmez.

**Bellek sınırları** (`deploy/sunucu/docker-compose.yml`): uygulama 512 MB,
veritabanı 256 MB, araçlar 384 MB. Taşma kendi konteynerimizde kalır;
çekirdeğin başka bir sürecin (ör. e-posta) öldürmesine yol açmaz.

**IP güvenliği:** nginx `X-Forwarded-For`'u ziyaretçinin değeriyle **değiştirir**
(`$remote_addr`), eklemez. Uygulama ilk değeri okuduğu için eklemek, giriş
kilidini ve hız sınırlarını sahte başlıkla atlatılabilir yapardı.

## Yeni sürüm yayınlama

Geliştirme makinesinde, `main` güncel, itilmiş ve CI yeşilken:

```bash
deploy/sunucu/gonder.sh
```

İmajlar GitHub Actions'ta amd64 için derlenir (`.github/workflows/imaj.yml`;
aynı commit zaten derlendiyse yeniden derlenmez). Sunucu yapıtı GitHub'dan kısa
ömürlü imzalı adresle kendisi indirir; GitHub'ın sunucuya erişimi yok. Betik
göç öncesi yedek alır, göçleri uygular, uygulamayı yeniden başlatır ve
`/api/v1/health` yeni süreçten yanıt verene kadar bekler. GitHub erişilemezse
yedek yol `YEREL=1 deploy/sunucu/gonder.sh` (Mac'te QEMU ile derleme, yavaş).

⚠️ Betik çalışırken `gonder.sh` dosyasını düzenlemeyin: bash betiği satır
satır okur.

Kontrol: `curl -s https://sahinsamet.com/api/v1/health`.

## Panel yöneticisi — BİR KEZ, site sahibi yapar

Şifre kimseye söylenmez, sohbete yazılmaz; sunucuda gizli girişle okunur:

```bash
ssh "$SUNUCU"
cd /opt/sahinsamet
read -rsp "Panel şifresi: " ADMIN_PASSWORD; echo
export ADMIN_PASSWORD
docker compose exec -T -e ADMIN_PASSWORD araclar \
  node --import ./scripts/yedek-register.mjs scripts/uretim-baslat.ts
unset ADMIN_PASSWORD
# [baslat] yönetici: oluşturuldu · profil: oluşturuldu
```

Sonra `https://sahinsamet.com/giris` → e-posta + şifre → panel 2FA kurulumunu
zorunlu açar; **kurtarma kodlarını kaydet**. Ardından panel → Profil.

### Bildirimleri (web push) açmak

Bir kez, sunucuda — anahtar ekrana basılmaz, doğrudan `.env`'e eklenir:

```sh
cd /opt/sahinsamet
grep -q '^VAPID_PUBLIC_KEY=.' .env || docker compose exec -T araclar node scripts/vapid-uret.mjs >> .env
docker compose up -d uygulama
```

`grep` koruması var olan anahtarın üstüne yazmayı önler — yeniden üretmek tüm
cihaz aboneliklerini geçersiz kılar.

### Şifreyi unuttum

`uretim-baslat.ts` var olan hesabın şifresine dokunmaz; sıfırlama ayrı betik:

```bash
ssh "$SUNUCU"
cd /opt/sahinsamet
read -rsp "Yeni şifre: " ADMIN_PASSWORD; echo
export ADMIN_PASSWORD
docker compose exec -T -e ADMIN_PASSWORD araclar \
  node --import ./scripts/yedek-register.mjs scripts/sifre-sifirla.ts
unset ADMIN_PASSWORD
```

Doğrulama uygulaması VE kurtarma kodları da kaybolduysa komutun sonuna
`--2fa-sifirla` ekle: ilk girişte 2FA kurulumu yeniden açılır.

## R2 (profil fotoğrafı ve uzak yedek)

Profil fotoğrafı yükleme R2 ister. Cloudflare → R2 → API anahtarı + iki bucket:
uygulama ve **ayrı** yedek. Değerleri `/opt/sahinsamet/.env`e sunucuda yaz,
sonra `cd /opt/sahinsamet && docker compose up -d`.

Uzak şifreli yedek için cron (`crontab -e`):

```
0 3 * * * cd /opt/sahinsamet && docker compose exec -T araclar node --import ./scripts/yedek-register.mjs scripts/yedek-al.ts >> /var/log/sahinsamet-yedek.log 2>&1
```

## Yerel yedek (R2 olmadan)

```
15 3 * * * /opt/sahinsamet/yedek-yerel.sh >> /var/log/sahinsamet-yedek.log 2>&1
```

Sunucu dışına kopya için Mac'te bir kez: `deploy/sunucu/yedek-cek-kur.sh`.

## Sırlar

`/opt/sahinsamet/.env` sunucuda `openssl rand` ile üretilir; hiçbir yere
yazdırılmaz. **`TOTP_ENCRYPTION_KEY` ve `BACKUP_ENCRYPTION_KEY`i parola
yöneticisine kopyala** — kaybolursa 2FA ve şifreli yedekler açılamaz.

## Geri yükleme (yerel yedekten)

```bash
cd /opt/sahinsamet
docker compose stop uygulama
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < yedek/sahinsamet-YYYY-AA-GG.dump
docker compose start uygulama
```
