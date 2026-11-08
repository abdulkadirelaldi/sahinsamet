# sahinsamet.com

Samet Şahin'in kişisel sayfası ve tek kullanıcılı yönetim paneli — tek bir Next.js uygulaması.

- **Site (`/`)** — tek sayfa: profil fotoğrafı, ad, kısa tanıtım, konum ve sosyal bağlantılar
  (Instagram, X, LinkedIn, YouTube, TikTok, GitHub, web sitesi, e-posta). İçeriğin tamamı panelden
  düzenlenir; boş bırakılan alan sayfada görünmez. Koyu/açık tema, paylaşım görseli (`/og`),
  `robots.txt`, `sitemap.xml`.
- **Panel (`/panel`)** — girişin arkasında: Bugün, Cüzdan (bütçe, hesaplar, borçlar), Hayat
  (alışkanlık, hedef, günlük), Spor (program, antrenman, rekorlar), Sağlık, İngilizce (üç parkur),
  haftalık/aylık özet, hızlı ekleme, push bildirimleri, çevrimdışı kayıt. Telefona uygulama gibi
  kurulabilir (PWA). Giriş: şifre + zorunlu 2FA (TOTP) ve isteğe bağlı Face ID / passkey.

Next.js 15, TypeScript, PostgreSQL 16 + Prisma 7, Tailwind CSS 4; testler Vitest (birim, bileşen,
gerçek PostgreSQL entegrasyon) ve Playwright (uçtan uca). Mimari kararlar:
[docs/DECISIONS.md](docs/DECISIONS.md), güvenlik notları: [docs/security](docs/security).

## Gereksinimler

| Araç    | Sürüm                                  |
| ------- | -------------------------------------- |
| Node.js | 22 LTS (`.nvmrc`)                      |
| pnpm    | 9.15.0 (`packageManager` alanından)    |
| Docker  | yerel PostgreSQL için (Colima da olur) |

`npm`/`yarn` kullanılmaz; yalnızca `pnpm-lock.yaml`.

## Yerel kurulum

```bash
git clone git@github.com:abdulkadirelaldi/sahinsamet.git
cd sahinsamet
nvm use && corepack enable
pnpm install                 # Prisma istemcisi de üretilir
cp .env.example .env         # değerleri doldur (aşağıda)
pnpm db:up                   # PostgreSQL 16 → konteyner sahinsamet-db-dev, 127.0.0.1:5434
pnpm exec prisma migrate deploy
pnpm db:seed                 # yönetici hesabı + boş profil
pnpm dev                     # http://localhost:3000
```

`.env` için asgari değerler:

```bash
DATABASE_URL=postgresql://sahinsamet:sahinsamet_dev_only@127.0.0.1:5434/sahinsamet?schema=public
NEXT_PUBLIC_SITE_URL=http://localhost:3000
AUTH_URL=http://localhost:3000
AUTH_SECRET=$(openssl rand -base64 32)
TOTP_ENCRYPTION_KEY=$(openssl rand -base64 32)
ADMIN_EMAIL=ornek@eposta.com
ADMIN_PASSWORD=...           # yalnızca yerelde; seed hash'leyip saklar
```

(`$(…)` satırlarını komutu çalıştırıp çıktısını yazarak doldurun.) Diğer anahtarlar isteğe bağlı:
R2 (profil fotoğrafı yükleme), VAPID (bildirimler), `ANTHROPIC_API_KEY` (tartı görseli okuma),
Umami (analitik). Hepsi `.env.example`'da açıklamalı.

Geliştirme veritabanı başka projelerle çakışmasın diye kendi konteynerinde (`sahinsamet-db-dev`) ve
5434 portundadır. Şema değişikliği: `prisma/schema.prisma` → `pnpm db:migrate` (yeni migration).

## Profili doldurmak

1. `http://localhost:3000/giris` (üretimde `https://sahinsamet.com/giris`) → e-posta + şifre.
2. İlk girişte 2FA kurulumu zorunludur: doğrulama uygulamasıyla QR'ı okut, **kurtarma kodlarını
   sakla**. İstersen Ayarlar → Güvenlik'ten Face ID / passkey ekle.
3. Panel → **Profil**:
   - **Fotoğraf** — yükle (kare, en az 400×400 önerilir), sonra **Kaydet**. Fotoğraf yoksa sayfada
     baş harfler (SŞ) görünür. Yükleme R2 ister.
   - **Tanıtım satırı** — adın altındaki kısa satır; **Konum** ve **Kısa tanıtım** isteğe bağlı.
   - **Sosyal bağlantılar** — "+ Instagram" gibi düğmelerle ekle, çöp kutusuyla kaldır. Adres tam
     olmalı (`https://…`) ve platformun kendi alan adında olmalı (Instagram alanına başka sitenin
     adresi kabul edilmez). E-posta sayfada `mailto:` bağlantısı olur.
4. **Kaydet** — ana sayfa anında güncellenir ("Sayfayı aç" ile kontrol et).

## Komutlar

| Komut                                                | Ne yapar                                           |
| ---------------------------------------------------- | -------------------------------------------------- |
| `pnpm dev`                                           | Geliştirme sunucusu                                |
| `pnpm build` / `pnpm start`                          | Üretim derlemesi / sunucusu                        |
| `pnpm lint` · `pnpm typecheck` · `pnpm format:check` | ESLint · TypeScript · Prettier                     |
| `pnpm exec vitest run`                               | Birim + bileşen testleri                           |
| `pnpm test:integration`                              | Gerçek PostgreSQL'e karşı testler (`DATABASE_URL`) |
| `pnpm exec playwright test --workers=1`              | Uçtan uca testler (derleyip kendi sunucusunu açar) |
| `pnpm db:up` / `pnpm db:down`                        | Yerel veritabanı konteyneri                        |
| `pnpm db:seed`                                       | Yönetici + yer tutucu profil (var olana dokunmaz)  |
| `node scripts/ikon-uret.mjs`                         | Uygulama ikonlarını (SŞ) yeniden üretir            |

Uçtan uca testler `.env`'deki `ADMIN_EMAIL`/`ADMIN_PASSWORD` ve veritabanını kullanır, kendi
oluşturduğu kayıtları siler. Port çakışırsa `E2E_PORT=3110` verin; Face ID testi için `.env`'e
`PASSKEY_TEST_KOKENI=http://localhost:<E2E_PORT>` ekleyin.

## Yayına alma

Uygulama, nginx'in önde durduğu paylaşımlı bir Linux sunucuda Docker ile çalışır; sunucudaki diğer
uygulamalarla hiçbir şey paylaşmaz (her şey `sahinsamet` önekli, uygulama yalnızca
`127.0.0.1:3410`). İmajlar sunucuda değil GitHub Actions'ta derlenir. Ayrıntılar ve işletme:
[docs/yayin-nginx.md](docs/yayin-nginx.md).

**Ön koşullar:** sunucuda Docker + Compose eklentisi, nginx, certbot, `python3`, `curl`; geliştirme
makinesinde `gh` (GitHub CLI, depoya yetkili) ve sunucuya anahtarla SSH. Sunucu adresi depoya
yazılmaz: `echo 'kullanici@sunucu' > ~/.config/sahinsamet/sunucu` (ya da `SUNUCU=` ortam
değişkeni).

### İlk kurulum (bir kez)

1. **DNS** — `sahinsamet.com` ve `www.sahinsamet.com` için **A** kaydı → sunucunun IP adresi
   (IPv6 varsa AAAA). Yayılmasını bekleyin: `dig +short sahinsamet.com`.
2. **Dizin, sırlar ve nginx — tek komut.** Geliştirme makinesinde, depo kökünde:

   ```bash
   S=$(cat ~/.config/sahinsamet/sunucu)
   scp deploy/sunucu/{docker-compose.yml,yedek-yerel.sh,nginx-sahinsamet.com.conf,ilk-kurulum.sh} "$S":/tmp/
   ssh "$S" 'bash /tmp/ilk-kurulum.sh panel-eposta@ornek.com'
   ```

   Betik 2–4. adımları yapar (sırları sunucuda üretir, ekrana basmaz; `.env` varsa durur). Elle
   yapmak isterseniz aşağıdaki adımlar aynı işi görür.

   **Elle:** sunucuda:

   ```bash
   sudo mkdir -p /opt/sahinsamet/yedek && cd /opt/sahinsamet
   sudo touch .env && sudo chmod 600 .env
   ```

   `.env` içeriği (değerleri sunucuda `openssl rand -base64 32` ile üretin, hiçbir yere
   yapıştırmayın):

   ```bash
   POSTGRES_USER=sahinsamet
   POSTGRES_PASSWORD=...
   POSTGRES_DB=sahinsamet
   NEXT_PUBLIC_SITE_URL=https://sahinsamet.com
   AUTH_SECRET=...
   TOTP_ENCRYPTION_KEY=...       # parola yöneticisine de kopyalayın
   TOTP_ISSUER='SŞ Panel'
   ADMIN_EMAIL=...
   ADMIN_NAME='Samet Şahin'
   BACKUP_ENCRYPTION_KEY=...     # parola yöneticisine de kopyalayın
   # isteğe bağlı: R2_*, BACKUP_R2_BUCKET, VAPID_*, ANTHROPIC_API_KEY, UMAMI_*
   ```

3. **Compose ve yedek betiği** — geliştirme makinesinden:

   ```bash
   scp deploy/sunucu/docker-compose.yml deploy/sunucu/yedek-yerel.sh "$(cat ~/.config/sahinsamet/sunucu)":/opt/sahinsamet/
   ```

4. **nginx** — `deploy/sunucu/nginx-sahinsamet.com.conf` dosyasını sunucuda
   `/etc/nginx/sites-available/sahinsamet.com` olarak kaydedin, sonra:

   ```bash
   sudo ln -s /etc/nginx/sites-available/sahinsamet.com /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d sahinsamet.com -d www.sahinsamet.com
   ```

   certbot 443 bloğunu ve HTTP → HTTPS yönlendirmesini ekler; www çıplak alan adına yönlenir,
   istekler `127.0.0.1:3410`'a gider.

5. **İlk yayın** — geliştirme makinesinde, `main` itilmiş ve CI yeşilken:

   ```bash
   deploy/sunucu/gonder.sh
   ```

   İmajlar derlenir, sunucuya yüklenir, göçler (`prisma migrate deploy`) uygulanır, uygulama kalkar.
   Kontrol: `curl -s https://sahinsamet.com/api/v1/health`.

6. **Yönetici hesabı** — sunucuda (şifre gizli girişle okunur, ekrana basılmaz):

   ```bash
   cd /opt/sahinsamet
   read -rsp "Panel şifresi: " ADMIN_PASSWORD; echo; export ADMIN_PASSWORD
   docker compose exec -T -e ADMIN_PASSWORD araclar \
     node --import ./scripts/yedek-register.mjs scripts/uretim-baslat.ts
   unset ADMIN_PASSWORD
   ```

   Sonra `https://sahinsamet.com/giris` → 2FA kurulumu → Profil.

7. **Yedek** — sunucuda `crontab -e`:
   `15 3 * * * /opt/sahinsamet/yedek-yerel.sh >> /var/log/sahinsamet-yedek.log 2>&1`.
   Sunucu dışı kopya için geliştirme makinesinde bir kez `deploy/sunucu/yedek-cek-kur.sh`.

**Sonraki sürümler:** `deploy/sunucu/gonder.sh` (yalnızca `main` ve yeşil CI; acil durumda
`ACIL=1`). **Bildirimler:** VAPID anahtarlarını üretme adımı `docs/yayin-nginx.md`'de.
**İzleme:** `.github/workflows/izleme.yml` yarım saatte bir sağlık ucunu, ana sayfayı ve sertifikayı
yoklar; site yayına girmeden önce kırmızı döner — ilk yayına kadar Actions'tan devre dışı
bırakılabilir.
