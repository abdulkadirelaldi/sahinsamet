# Geri Yükleme — §8.22

> **Bu belge en kötü günde okunacak.** Varsayım yok: hangi komut, hangi
> sırayla, hangi ortam değişkeni. Komutlar kopyalanıp yapıştırılacak biçimde
> yazılı.
>
> **Son prova:** 2026-10-16 · T-066 · **GEÇTİ** (ölçüm çıktısı en altta)

---

## 0. Önce şunu bil

| Soru | Cevap |
| ---- | ----- |
| Yedek nerede | Cloudflare R2, kova `BACKUP_R2_BUCKET` (`sahinsamet-yedek`) |
| Nesne adı | `yedek/sahinsamet-YYYY-MM-DD.dump.enc` — **gün bazlı, UTC** |
| Biçim | `pg_dump -Fc` (sıkıştırılmış) → **AES-256-GCM** ile şifreli |
| Kaç gün saklanıyor | **30 gün** (`SAKLAMA_GUNU`) |
| Şifre anahtarı | `BACKUP_ENCRYPTION_KEY` — base64, 32 bayt |

### ⚠️ Anahtar kaybı

**`BACKUP_ENCRYPTION_KEY` kaybolursa yedekler OKUNAMAZ.** Kurtarma yolu yok;
AES-256-GCM'i anahtarsız çözmenin yolu yoktur.

Bu bir **takas**, kusur değil: anahtarsız okunabilen bir yedek, R2 kimlik
bilgisi sızan herkesin okuyabildiği bir yedektir — ve yedek `Client.email`,
ziyaretçi mesajlarının gövdesi ve tüm denetim kaydını taşıyor.

**Anahtar nerede olmalı:** `.env` (sunucuda) **ve** ondan bağımsız bir yerde
(şifre yöneticisi). Yalnızca `.env`'de tutmak, sunucu kaybında yedeği de
kaybetmek demek — yani yedeklemenin amacını ortadan kaldırır.

Yeni anahtar üretmek (yalnızca **ilk kurulumda** ya da anahtar rotasyonunda;
**eski yedekler eski anahtarla kalır**):

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

---

## 1. Ortamı yükle

Betikler `.env` dosyasını **kendileri okumaz** — dışarıdan beklerler ve eksik
değişkeni **adıyla** söylerler.

```bash
cd /path/to/sahinsamet
set -a; . ./.env; set +a
```

Gereken değişkenler: `DATABASE_URL`, `BACKUP_R2_BUCKET`,
`BACKUP_ENCRYPTION_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`.

**Araç gereksinimi:** `pg_dump` / `psql` / `pg_restore`, sunucudaki Postgres
ile **aynı ana sürüm** (bugün 16). Kontrol:

```bash
pg_dump --version      # 16.x olmalı
psql "$DATABASE_URL" -At -c "show server_version;"
```

> **Aynı ANA sürüm içinde küçük fark sorun değil — ölçüldü:** 2026-10-16
> provası istemci **16.13** ile sunucu **16.14**'e karşı koştu ve geçti.
> Kural ana sürüm için geçerli: istemci sunucudan **yeni** olabilir, ana
> sürüm olarak **eski** olamaz (15 istemci, 16 sunucuyu geri yükleyemez).

---

## 2. Yedek al (elle)

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
     --import ./scripts/yedek-register.mjs scripts/yedek-al.ts
```

Çıktı şöyle görünür:

```
[yedek] yedek/sahinsamet-2026-10-16.dump.enc
  dump: 80725 bayt · şifreli: 80767 bayt (+42 başlık)
  saklama: 30 gün · budama: 7 anahtara silme gönderildi, 7 kabul edildi
```

⚠️ **Boyuta bak.** Birkaç yüz baytlık bir "yedek", boş bir veritabanının
dump'ıdır ve `EXIT 0` ile yazılır. Dosyanın var olması, anlamlı olduğunu
söylemez.

---

## 3. GERİ YÜKLEME — gerçek olay

### 3a. Nesneyi indir ve çöz

Hangi yedeği geri yükleyeceğine karar ver (nesne adı gün taşıyor). Sonra:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
     --import ./scripts/yedek-register.mjs \
     scripts/geri-yukleme-provasi.ts yedek/sahinsamet-2026-10-16.dump.enc
```

> Bu komut **provadır**: ayrı bir veritabanına yükler, karşılaştırır ve o
> veritabanını **siler**. Canlıya dokunmaz. Gerçek bir olayda **önce bunu
> koştur** — elindeki dosyanın okunabildiğini öğrenmek, canlıyı silmeden önce
> bilinmesi gereken şey.

### 3b. Canlıya geri yükle

**Prova geçtikten sonra.** Üç adım, sırayla:

```bash
# 1) Dosyayı indir ve çöz (çıktı: ./geri-yukleme.dump)
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
     --import ./scripts/yedek-register.mjs -e "
const { getObjectBytes, readR2Config } = await import('@/server/storage/r2');
const { yedekAnahtari, yedekCoz } = await import('./scripts/yedek-ortak');
const key = process.argv[1];
const config = readR2Config({ ...process.env, R2_BUCKET: process.env.BACKUP_R2_BUCKET });
const blob = await getObjectBytes(key, { config });
if (!blob) throw new Error('nesne bulunamadı: ' + key);
const duz = yedekCoz(blob, yedekAnahtari());
await (await import('node:fs/promises')).writeFile('geri-yukleme.dump', duz);
console.log('çözüldü:', duz.length, 'bayt → geri-yukleme.dump');
" yedek/sahinsamet-2026-10-16.dump.enc

# 2) Hedef veritabanını BOŞALT (⚠️ geri dönüşü yok)
psql "$DATABASE_URL" -c "drop schema public cascade; create schema public;"

# 3) Yükle
pg_restore --no-owner --no-privileges -d "$DATABASE_URL" geri-yukleme.dump
```

Ardından **mutlaka**:

```bash
rm -f geri-yukleme.dump     # çözülmüş dump diskte kalmamalı — şifresiz kopya
```

### 3c. Geri yüklemeden sonra doğrula

```bash
psql "$DATABASE_URL" -At -c 'select count(*) from "transaction";'
psql "$DATABASE_URL" -At -c 'select coalesce(sum("baseAmount"),0)::text from "transaction";'
psql "$DATABASE_URL" -At -c 'select count(*) from "audit_log";'
```

Sayılar yedeğin alındığı günle tutarlı olmalı. **Tutarsızsa dur** — yanlış
günün yedeğini yüklemiş olabilirsin.

---

## 4. Hata mesajları ve ne anlama geldikleri

Mesajlar bilerek birbirinden ayrı: "çözülemedi" demek, hangi şeyin yanlış
olduğunu söylemeyen bir teşhistir.

| Mesaj | Anlamı | Ne yapmalı |
| ----- | ------ | ---------- |
| `Dosya bu sistemin yedeği değil (sihirli dize eşleşmiyor)` | Dosya başka bir şey | **Anahtarı suçlamadan önce** nesne adını kontrol et |
| `Yedek biçimi sürüm N, bu araç sürüm M okuyor` | Biçim değişmiş | O sürümün aracı gerekiyor (git geçmişi) |
| `Dosya çok kısa` | Aktarım yarıda kesilmiş | R2'den yeniden indir |
| `doğrulama etiketi tutmadı` | **Yanlış anahtar VEYA bozuk dosya** — GCM ikisini ayırt etmez | Dosya boyutunu R2'deki boyutla karşılaştır: eşitse anahtar yanlış, değilse dosya bozuk |
| `BACKUP_ENCRYPTION_KEY 32 bayt olmalı, N bayt çözüldü` | Değer base64 değil ya da kırpılmış | `.env` satırını kontrol et (tırnak, satır sonu) |
| `invalid URI query parameter: "schema"` | **Olmamalı** — betik bunu temizliyor | `libpqUrl` atlanmış; `scripts/yedek-ortak.ts`'e bak |

---

## 5. Prova — §8.22'nin ölçümü

> **Bir yedek, geri yüklendiği kanıtlanmadıkça yedek değildir.**
> "Betik koştu, dosya oluştu, EXIT 0" hiçbir şey kanıtlamaz.

`scripts/geri-yukleme-provasi.ts` zincirin tamamını koşturur ve her halkayı
ayrı ölçer: **indir → çöz (AEAD) → ayrı veritabanına yükle → satır sayılarını
ve örnek değerleri karşılaştır → prova veritabanını sil.**

Satır sayısı tek başına yetmez: bozuk bir `numeric` ölçeği satır sayısını
değiştirmez. Bu yüzden `transaction.baseAmount` **toplamı** da
karşılaştırılıyor (ADR-014'ün kuruş hassasiyeti), `audit_log` en yeni
`createdAt` (zaman damgası davranışı) ve e-postası olan kullanıcı sayısı
(§8.20: **değer basılmadan**).

### 2026-10-16 provası — ölçüm çıktısı

```
1. indirildi      : 80767 bayt (yedek/sahinsamet-2026-10-16.dump.enc)
2. çözüldü        : 80725 bayt · GCM etiketi DOĞRULANDI
3. prova veritabanı: sahinsamet_prova_1792134559884 (oluşturuldu)
4. pg_restore     : tamamlandı
5. satır sayıları :
   ✓ user                   kaynak 1 · prova 1
   ✓ client                 kaynak 2 · prova 2
   ✓ job                    kaynak 2 · prova 2
   ✓ transaction            kaynak 5 · prova 5
   ✓ transaction_category   kaynak 6 · prova 6
   ✓ recurring_transaction  kaynak 1 · prova 1
   ✓ contact_message        kaynak 0 · prova 0
   ✓ audit_log              kaynak 257 · prova 257
   ✓ project                kaynak 2 · prova 2
   ✓ post                   kaynak 2 · prova 2
6. örnek değerler :
   ✓ transaction.baseAmount toplamı: 131662.50 | 131662.50
   ✓ audit_log en yeni createdAt: 2026-10-14 11:05:28.01 | 2026-10-14 11:05:28.01
   ✓ user: e-postası olan satır: 1 | 1

PROVA SONUCU: GEÇTİ — yedek geri yüklenebilir ve veri birebir.
[prova] temizlendi: sahinsamet_prova_1792134559884 silindi, geçici dizin silindi
```

Temizlik de doğrulandı: `pg_database`'de `%prova%` eşleşmesi **yok**, geçici
dizin **yok**.

### ⚠️ Prova neyi ÖLÇMÜYOR

- **Üretim ortamı.** Prova dev Postgres'inde koştu. Üretimde sürüm, TLS ve
  erişim yolu farklı; §3'teki komutlar o ortam içindir.
- **Büyük veri.** 80 KB'lık bir dump geri yüklendi. Veri büyüdüğünde süre ve
  bellek davranışı ölçülmedi.
- **Zamanlanmış koşum.** Cron F7/T-073'te. Bugün ölçülen şey **mantık**;
  tetikleyici sonra geliyor (ADR-040'ın kalıbı).

---

## 6. Saklama ve birikim

**30 gün.** Her koşum, yaşı dolan **7 günlük bir pencereyi** silmeye çalışır —
tek gün değil, çünkü yedekleme birkaç gün koşmazsa o günlerin nesneleri
sonsuza kadar kalırdı.

Silme **listeleme gerektirmiyor**: anahtarlar güne göre deterministik olduğu
için silinecek anahtar hesaplanabiliyor. R2'de var olmayan bir anahtara DELETE
başarı döner, yani fazladan silme denemesi zararsız.

⚠️ **Çıktıdaki sayı "silindi" demez, "silme gönderildi" der.** R2 olmayan
anahtarı da kabul ettiği için "kaç nesne gerçekten gitti" bu yolla ölçülemez.

R2 ücretsiz katmanı **10 GB**. Bugünkü ölçümle 30 günlük yedek ≈ **2,4 MB**
(80 KB × 30) — sınırın çok altında. Veri büyüdüğünde bu oran yeniden
ölçülmeli; sonsuz birikim bir gün sınırı aşar ve o gün yedekleme **sessizce**
durur.

---

## 7. Bilinen riskler ve kararlar

### Aynı sağlayıcıda yedek — **v1 için kabul edildi**

Site ve yedek **aynı Cloudflare hesabında**. Hesap kapanırsa ya da erişim
kaybedilirse ikisi birlikte etkilenir.

**Karar: v1 için kabul edilebilir, ve gerekçesi bir ölçüm.** Yedeklemenin
koruduğu senaryoların sıklık sırası şu:

1. **Yanlış `DELETE`/göç** — en olası. R2 bunu tamamen karşılıyor.
2. **Veritabanı bozulması / sunucu kaybı** — R2 bunu karşılıyor.
3. **Cloudflare hesabının kaybı** — en düşük olasılık, ve tek başına veri
   kaybı değil: site de erişilemez olur, yani sorun yedekten büyük.

İlk iki senaryo yedeklemenin varlık sebebi ve ikisi de karşılanıyor. Üçüncüsü
için **ikinci bir kopya** gerekiyor ve uygulaması **F7'ye** bırakıldı; karar
bugün verildi:

> **Haftalık bir kopya, sağlayıcı dışına.** En basit biçimi: haftada bir
> yedeği indirip şifreli hâliyle ikinci bir yere (başka bir bulut ya da
> fiziksel disk) koymak. Dosya **zaten şifreli** olduğu için ikinci yerin
> güvenlik gereksinimi düşük — anahtar orada değil.

### §8.20 — yedek kişisel veri taşıyor, şifre yeterli mi

Yedek `Client.email`, ziyaretçi mesajlarının **gövdesini** ve tüm denetim
kaydını taşıyor.

**Karar: şifreleme gerekli ama tek başına yeterli değil — erişim kaydı da
gerekli, ve bugünkü hâli şu:**

| Katman | Durum |
| ------ | ----- |
| Durağan şifreleme | ✅ AES-256-GCM, anahtar R2'de **değil** |
| R2 kovası public değil | ✅ Orkestra Şefi ölçtü: imzasız erişim `400`/`ECONNRESET` |
| İmzalı adres ömrü | ✅ okuma 15 dk, yazma 5 dk (`r2.ts`) |
| **Erişim kaydı** | ⚠️ **YOK** — ayrıntı aşağıda |

**Neden erişim kaydı gerekli:** şifreleme dosyayı okunamaz kılıyor ama
**indirildiğini** kimse bilmiyor. Anahtar ve R2 kimlik bilgisi birlikte sızsa
(ikisi de `.env`'de), veri dışarı çıkar ve **hiçbir iz kalmaz**. Denetim kaydı
(§4.2) uygulama içindeki her değişikliği yazıyor; yedek yolu o kapsamın
dışında.

**Bugün yazılmadı ve sebebi:** erişim kaydının doğru yeri uygulama değil, R2
tarafı. Cloudflare R2 erişim günlüğü kova ayarıdır; betiğe `writeAuditLog`
eklemek yalnızca **bizim** yaptığımız indirmeleri kaydeder — yani asıl tehdidi
(kimlik bilgisiyle doğrudan erişim) **hiç görmez**. Yanlış katmana yazılan bir
kayıt, güvence hissi verir ve tehdidi kaçırır.

> **F7/T-073'e devredilen:** R2 kova erişim günlüğünün açılması, ve
> `BACKUP_ENCRYPTION_KEY`in `.env`'den ayrı bir yerde tutulması (ikisi aynı
> dosyada olduğu sürece "iki şeyin birlikte sızması" tek bir olaydır).

---

## 8. F7/T-073'ün devralacağı yüzey

| Devredilen | Bugünkü hâl |
| ---------- | ----------- |
| Cron tetikleyici (gece 03:00) | Betik **elle** koşturulabilir; mantık ölçülü (ADR-040 kalıbı) |
| Kararlı giriş noktası | Komut uzun; `package.json`'a `pnpm yedek` kısayolu **Orkestra Şefi'nin** (benim kapsamım `pnpm.overrides`) |
| İzleme (§13.7) | Betik dump **boyutunu** basıyor — "boş yedek" sinyali olarak kullanılabilir |
| İkinci kopya | Karar verildi (haftalık, sağlayıcı dışı), uygulama F7 |
| R2 erişim günlüğü | Kova ayarı; açılması F7 |
| Anahtarın ayrı saklanması | `.env` dışına taşınması F7 |
