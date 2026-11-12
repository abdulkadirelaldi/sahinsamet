# DECISIONS.md — Mimari Karar Kayıtları (ADR)

> **Not (2026-11-08):** Bu proje (sahinsamet.com) daha önce yazılmış bir kişisel
> site + panel kod tabanından türetildi. ADR-001…048 o kod tabanının kararlarıdır
> ve kodun yorumlarındaki ADR/T numaraları bunlara işaret eder. Public site ve
> içerik modeline ilişkin olanlar (ADR-019, 026, 027, 045, 046, 047) **ADR-049 ile
> geçerliliğini yitirdi**; panel, güvenlik, veri ve test kararları aynen geçerli.
> Metinlerde geçen `PROGRAM.md` ve görev kartları bu depoda yok.

> Format: **Bağlam → Karar → Sonuçlar → Alternatifler ve neden reddedildi** (PROGRAM.md §14).
> PROGRAM.md'de yazan bir şey değişecekse **önce buraya ADR yazılır**, sonra PROGRAM.md güncellenir.
> Yalnızca Orkestra Şefi yazar.

| # | Karar | Tarih | Durum |
|---|-------|-------|-------|
| ADR-001 | Teknoloji yığını kilidi | 2026-08-04 | Kabul edildi |
| ADR-002 | Tailwind CSS v4 — CSS-first yapılandırma | 2026-08-04 | Kabul edildi |
| ADR-003 | Paket yöneticisi: pnpm | 2026-08-04 | Kabul edildi |
| ADR-004 | F0'da tüm bağımlılıklar tek elden kurulur | 2026-08-04 | Kabul edildi |
| ADR-005 | Prisma 7 sürücü adaptörü — `@prisma/adapter-pg` + `pg` | 2026-08-04 | Kabul edildi |
| ADR-006 | Üretilen Prisma istemcisi VCS'e girmez, `postinstall` ile üretilir | 2026-08-04 | Kabul edildi |
| ADR-007 | `prisma.config.ts` Backend mülkiyetindedir | 2026-08-04 | Kabul edildi |
| ADR-008 | Node.js 22 LTS'e yükselme — Node 20 EOL | 2026-08-05 | Kabul edildi |
| ADR-009 | Repo GitHub'da, CI GitHub Actions ile | 2026-08-05 | Kabul edildi |
| ADR-010 | Kendi cookie tabanlı tema sağlayıcısı — `next-themes` kullanılmaz | 2026-08-05 | Kabul edildi |
| ADR-011 | Dinamik render kabul edilir; önbellek veri katmanında çözülür | 2026-08-05 | Kabul edildi |
| ADR-012 | Veri bağımsız F2 hazırlığı F1 ile paralel yürüyebilir | 2026-08-05 | Kabul edildi |
| ADR-013 | Auth: JWT session, TOTP kurtarma kodu, `LoginAttempt` tablosu | 2026-08-05 | Kabul edildi |
| ADR-014 | Para birimi: kur snapshot'ı; KDV/stopaj v1 kapsamı dışı; `Decimal` → `string` DTO | 2026-08-05 | Kabul edildi |
| ADR-015 | Tekrarlayan işlem ayrı model + idempotent üretim | 2026-08-05 | Kabul edildi |
| ADR-016 | Gün semantiği `@db.Date`, tek zaman dilimi yardımcısı | 2026-08-05 | Kabul edildi |
| ADR-017 | İlişki ve bütünlük düzeltmeleri; `Job.status` ↔ kanban eşlemesi | 2026-08-05 | Kabul edildi |
| ADR-018 | Dosya yönetimi: URL saklanmaz, `Attachment` tek mekanizma | 2026-08-05 | Kabul edildi |
| ADR-019 | İçerik modeli: `locale`, yayın durumu, `viewCount`, etiketler | 2026-08-05 | Kabul edildi |
| ADR-020 | Enum sözleşmesi ve `AuditLog` redaksiyonu | 2026-08-05 | Kabul edildi |
| ADR-021 | Spor & hayat: PR tekrar bazında, `Habit` sayaç tabanlı | 2026-08-05 | Kabul edildi |
| ADR-022 | `LoginAttempt` denemeleri, `AuditLog` sonuçları kaydeder | 2026-08-05 | Kabul edildi |
| ADR-023 | Ölçüm görevleri tek başına koşar — paralel derleme yasağı | 2026-08-05 · **rev. 2026-08-10** | Kabul edildi |
| ADR-024 | Kendi QR kodlayıcımız — dar kapsam, kalıcı doğrulama şartıyla | 2026-08-10 | Kabul edildi |
| ADR-025 | React Bits bağımlılıkları: `ogl` onaylandı, `gsap` reddedildi | 2026-08-11 | Kabul edildi |
| ADR-026 | F2 public sayfaları gerçek veriden okur; içerik servisleri F3'ten öne alındı | 2026-08-11 | Kabul edildi |
| ADR-027 | İstatistikler türetilir, elle girilmez | 2026-08-12 | Kabul edildi |
| ADR-028 | Dal ve commit disiplini: tur başına tek PR, Orkestra Şefi commit'ler | 2026-08-14 | Kabul edildi |
| ADR-029 | `revalidateTag` tam dize eşleşir; her seviye ayrı düşürülür | 2026-08-14 · **rev. 2026-10-07 (T-045)** | Kabul edildi |
| ADR-030 | Seed, ölçüm sözleşmesidir | 2026-08-16 | Kabul edildi |
| ADR-031 | Fontlar repoda barındırılır — `next/font/local` | 2026-08-16 | Kabul edildi |
| ADR-032 | Kullanıcı girdisi önbellek anahtarına doğrulanmadan girmez | 2026-08-16 | Kabul edildi |
| ADR-033 | URL filtre boole'ları `booleanFilterSchema` ile; `z.coerce.boolean()` yasak | 2026-09-11 | Kabul edildi |
| ADR-034 | `redactAuditDiff` emniyet ağıdır, korumanın kendisi değil | 2026-09-19 | Kabul edildi |
| ADR-035 | Oturum geçersizleştirme üç katmanda; kapsamlar adlarında | 2026-09-20 | Kabul edildi |
| ADR-036 | `KAPSAM` beyanını rotayı yazan doldurur (§10.1 istisnası) | 2026-10-07 | Kabul edildi |
| ADR-037 | Bir istisnanın kendi gerekçesi de ölçülür | 2026-10-10 | Kabul edildi |
| ADR-038 | Mutasyon anlık görüntüyle geri alınır; commit rapor başına | 2026-10-12 | Kabul edildi |
| ADR-039 | Kategori türü ile işlem türü eşleşmek zorunda değil; uyuşmazlık gizlenmez | 2026-10-12 | Kabul edildi |
| ADR-040 | `RecurringTransaction`: tetikleyici elle, cron sonra aynı eylemi çağırır | 2026-10-14 | Kabul edildi |
| ADR-041 | Q1: panel `/panel` altında kalır — alt alan adı yalıtım sağlamıyor | 2026-10-14 | Kabul edildi |
| ADR-042 | Q2: v1 de mail sağlayıcı yok — bildirimin amacı panel rozetiyle karşılanıyor | 2026-10-14 | Kabul edildi |
| ADR-043 | Yüklenen SVG kabul edilmez — güven sınırı "kim yazdı", "hangi tip" değil | 2026-10-16 | Kabul edildi |
| ADR-044 | Dosyalar aynı kökenden yüklenir ve sunulur — tarayıcı R2'ye hiç gitmez | 2026-10-20 | Kabul edildi |
| ADR-049 | Public site tek sayfa (profil); içerik modülleri ve çok dil kaldırıldı | 2026-11-08 | Kabul edildi |

---

## ADR-001 — Teknoloji Yığını Kilidi

**Durum:** Kabul edildi · 2026-08-04

### Bağlam
Proje iki farklı yüzü olan tek bir uygulama: SEO ve performans önceliğinin yüksek olduğu
public bir portföy sitesi (§1.A) ve tek kullanıcılı, veri yoğun, hassas veri (muhasebe,
sağlık) tutan bir yönetim paneli (§1.B). Barındırma kendi sunucumuzda, Coolify + Docker ile
yapılacak (§13) — yani satıcıya özel (vendor-specific) çalışma zamanlarına bağlanılamaz.
Ekip tek kişilik; bu yüzden bakım yükünü düşük tutan, tek dilli (TypeScript) ve tek
depoda toplanan bir yığın gerekiyor.

### Karar
PROGRAM.md §2'deki yığın **kilitlenmiştir** ve şu gerekçelerle seçilmiştir:

| Seçim | Gerekçe |
|-------|---------|
| **Next.js 15 App Router + TS strict** | Tek kod tabanında hem statik/ISR public sayfalar hem korumalı panel. Server Components varsayılan olduğu için panel sorguları istemciye sızmaz. Server Actions, panel mutasyonları için ayrı bir API katmanı yazma zorunluluğunu kaldırır (§7.1). |
| **PostgreSQL 16 (kendi sunucu, Docker)** | İlişkisel model (§6) yoğun bağlantılı: `Job → Transaction`, `ContactMessage → Job`. `Decimal(12,2)` para desteği ve gerçek transaction garantisi şart. Kendi sunucuda tutmak, hassas sağlık/muhasebe verisini üçüncü tarafın dışında bırakır. |
| **Prisma, ham SQL yasak** | Tip güvenli sorgu, migration geçmişi, tek noktadan şema. Ham SQL yasağı, enjeksiyon yüzeyini pratikte sıfırlar (§8.10). |
| **Auth.js v5 Credentials + TOTP** | Tek kullanıcılı sistemde OAuth sağlayıcıya bağımlılık gereksiz risk. TOTP, harici servis olmadan ikinci faktör verir. |
| **argon2id (bcrypt değil)** | Argon2id bellek-zor (memory-hard); GPU ile paralel kırmaya bcrypt'ten dayanıklı. Tek hesabın korunması kritik olduğu için en güçlü seçenek alınmıştır (§8.2). |
| **Zod, istemci+sunucu ortak** | Doğrulama kuralı tek yerde yaşar; frontend ile backend'in kural kayması (drift) yapısal olarak engellenir (§7.3). Şema dosyalarının mülkiyeti Backend'dedir. |
| **Tailwind + CSS değişkenleri** | İki tema (koyu varsayılan + aydınlık zorunlu) tek token setiyle yönetilir; bileşende hex yazmak yasaklanınca tema tutarlılığı derleme zamanı yerine kural düzeyinde garanti altına alınır (§3.1). |
| **React Bits + Framer Motion** | Görsel iddia public tarafın satış argümanı. Ancak §5.2 sert kurallarıyla sınırlandırılır: panelde WebGL yok, sayfa başına 1 shader, `prefers-reduced-motion` fallback zorunlu. |
| **Cloudflare R2 (private + imzalı URL)** | S3 uyumlu, çıkış ücreti yok; hem varlıklar hem gece yedeği aynı depoda (§8.21). |
| **Vitest + Playwright** | Vitest Vite tabanlı, Next 15 ile hızlı; Playwright §9'daki 7 senaryonun tamamını (mobil görünüm dahil) tek araçla kapsar. |
| **Coolify + Docker (kendi sunucu)** | Vercel'e özgü kısıtlar (cron sınırı, uzun süren işler, DB'nin ayrı satıcıda olması) elenir. `pg_dump` cron'u ve Postgres aynı makinede olduğu için yedekleme basitleşir. |

### Sonuçlar
- **Olumlu:** Tek dil, tek repo, tek deploy hedefi. Veri tamamen kendi kontrolümüzde. Zod sözleşmesi sayesinde Backend ve Frontend ajanları birbirinin kodunu görmeden entegre olabilir.
- **Olumsuz / kabul edilen maliyet:** Sunucu bakımı (yama, disk, izleme) bize ait. `output: 'standalone'` Docker imajı ve migration akışı elle kurulmalı. Auth.js v5 belgeleri hâlâ hareketli — kırıcı değişiklik riski F1'de takip edilecek.
- **Zorunlu kıldığı kurallar:** `any` / `@ts-ignore` yasak; DB erişimi yalnız `src/server/services/`; her Server Action kendi `auth()` kontrolünü yapar; onaysız bağımlılık eklenmez.

### Alternatifler ve neden reddedildi
- **Astro + ayrı panel uygulaması** — Public taraf için daha hafif olurdu, ama iki uygulama iki deploy, iki auth, iki tip katmanı demek. K2 (panelden yönetilebilirlik) tek uygulamada çok daha ucuz.
- **Vercel + Neon/Supabase** — Kurulumu en hızlı seçenek; reddedildi çünkü hassas sağlık ve muhasebe verisi üçüncü tarafa çıkar, cron/yedekleme satıcı sınırlarına takılır ve §13'teki kendi sunucu kararıyla çelişir.
- **Drizzle ORM** — Daha ince bir katman ve SQL'e yakın; reddedildi çünkü Prisma'nın migration ve şema araçları tek kişilik bakımda daha az hata üretiyor, `Decimal` desteği olgun.
- **bcrypt** — Yaygın ve yeterli sayılır; reddedildi çünkü argon2id bellek-zor ve tek hesabın korunmasında ölçülebilir biçimde üstün.
- **Clerk / Auth0** — Kurulum kolaylığı var; reddedildi çünkü tek kullanıcı için aylık maliyet ve dış bağımlılık anlamsız, ayrıca kimlik verisi dışarı çıkar.
- **MongoDB** — Reddedildi: §6'daki model ilişkisel ve para hesabı `Decimal` gerektiriyor; belge veritabanı burada yanlış araç.

---

## ADR-002 — Tailwind CSS v4, CSS-first Yapılandırma

**Durum:** Kabul edildi · 2026-08-04

### Bağlam
PROGRAM.md §2 "Tailwind CSS + CSS değişkenleri" diyor, §10.1 ise ortak dosyalar arasında
`tailwind.config.ts` sayıyor. Tailwind v4 yapılandırmayı JS dosyasından CSS'e taşıdı
(`@import "tailwindcss"` + `@theme`). Next.js 15 ile kurulan yeni projeler varsayılan
olarak v4 gelir. §3.1 zaten "tüm renkler CSS değişkeni olarak tanımlanır, hiçbir bileşende
hex yazılmaz" diyor — bu, v4'ün çalışma biçimiyle birebir örtüşüyor.

### Karar
Tailwind CSS **v4** kullanılır. Tasarım token'ları `src/app/globals.css` içinde `@theme`
bloğunda tanımlanır; `tailwind.config.ts` dosyası **oluşturulmaz**.
`globals.css` bundan böyle §10.1 anlamında **ortak dosyadır**: sahibi Frontend ajanıdır,
başka bir ajanın değişiklik ihtiyacı Orkestra Şefi üzerinden yürür.

### Sonuçlar
- Token'lar tek dosyada (`globals.css`) yaşar; §3.1'in "hex yasak" kuralı tek yerden denetlenebilir.
- PROGRAM.md §10.1'deki ortak dosya listesinden `tailwind.config.ts` çıkarılıp yerine `globals.css` konacak. *(PROGRAM.md güncellemesi F0 sonunda toplu yapılacak.)*
- v4 için PostCSS eklentisi `@tailwindcss/postcss` olur; eski `tailwindcss` + `autoprefixer` ikilisi kullanılmaz.

### Alternatifler ve neden reddedildi
- **Tailwind v3'e sabitlemek** — PROGRAM.md metnine harfiyen uyardı; reddedildi çünkü yeni projede geriye dönük sürüm sabitlemek, ilk günden teknik borç yaratır ve v3'ün JS config'i §3.1'in CSS değişkeni felsefesiyle gereksiz bir ikinci kaynak oluşturur.
- **v4 ama `@config` ile JS dosyası kullanmak** — İki yapılandırma kaynağı demek; token'ın nerede tanımlı olduğu belirsizleşir.

---

## ADR-003 — Paket Yöneticisi: pnpm

**Durum:** Kabul edildi · 2026-08-04

### Bağlam
PROGRAM.md §10.5 commit öncesi komutları `pnpm lint && pnpm typecheck && pnpm test`
olarak yazıyor, ancak §5'teki React Bits kurulum komutu `npx shadcn@latest` kullanıyor.
Paket yöneticisi hiçbir yerde açıkça kilitlenmemiş.

### Karar
Paket yöneticisi **pnpm**'dir. `package.json` içinde `packageManager` alanı ile sürüm
sabitlenir, `pnpm-lock.yaml` repoya girer. React Bits kurulumu §5'teki komutla
(`npx shadcn@latest add ...`) yapılmaya devam eder — bu komut yalnızca dosya kopyalar,
paket yöneticisi seçimini etkilemez.

### Sonuçlar
- CI, Docker imajı ve tüm ajan promptları `pnpm` kullanır; `npm install` çalıştırılmaz.
- İçerik adresli depo sayesinde Docker build katmanları ve disk kullanımı daha verimli.
- `npm-shrinkwrap.json` / `package-lock.json` repoda bulunursa CI hata verir.

### Alternatifler ve neden reddedildi
- **npm** — En yaygın ve sıfır kurulum; reddedildi çünkü §10.5 zaten pnpm yazıyor ve tek kaynakta tutarlılık, marjinal kurulum kolaylığından değerli.
- **bun** — Daha hızlı; reddedildi çünkü Prisma ve Next 15 üretim derlemesiyle uyum riski var, tek kişilik bakımda hata ayıklama maliyeti yüksek.

---

## ADR-004 — F0'da Tüm Bağımlılıklar Tek Elden Kurulur

**Durum:** Kabul edildi · 2026-08-04

### Bağlam
`package.json` §10.1'e göre ortak dosya. F0'da Backend (Prisma, Auth.js, Zod) ve Frontend
(next-themes, Framer Motion, react-hook-form) aynı anda bağımlılık eklemek isterse
`package.json` ve lock dosyasında çakışma çıkar. Ajanlar birbirinin çalışmasını görmüyor,
bu yüzden çakışmayı çözecek bir merci yok.

### Karar
F0'ın ilk görevinde (T-001) **Backend ajanı, F0–F2 için gereken tüm bağımlılıkları tek
seferde kurar**. Sonraki görevlerde hiçbir ajan `package.json`'a doğrudan dokunmaz;
yeni bağımlılık ihtiyacı raporun "Engeller / talepler" bölümünde Orkestra Şefi'ne bildirilir,
o da ADR yazıp kurulum için ayrı görev açar (§8.25).

### Sonuçlar
- Lock dosyası çakışması yapısal olarak imkânsız hale gelir.
- Kurulan ama F2'ye kadar kullanılmayan paketler olur — kabul edilen maliyet; `pnpm` ile disk etkisi ihmal edilebilir.
- Her yeni bağımlılık bir ADR bırakır; §8.25 denetlenebilir hale gelir.

### Alternatifler ve neden reddedildi
- **Her ajan kendi bağımlılığını kursun** — Doğal görünüyor; reddedildi çünkü paralel çalışan iki ajan lock dosyasını kaçınılmaz olarak çakıştırır ve bunu çözmek elle birleştirme (merge) gerektirir.
- **Orkestra Şefi kursun** — §10.1'e aykırı: Orkestra Şefi kod ve yapılandırma yazmaz.

---

## ADR-005 — Prisma 7 Sürücü Adaptörü: `@prisma/adapter-pg` + `pg`

**Durum:** Kabul edildi · 2026-08-04
**Tetikleyen:** T-003 raporu, engel E1 · **İlgili risk:** R8

### Bağlam
ADR-004 gereği bağımlılıklar T-001'de tek seferde kuruldu ve sonraki görevlerde yeni paket
eklenmesi yasaklandı. T-003'te bu kuralın öngörmediği bir durum çıktı: Prisma **7.9.1**,
v6'dan farklı olarak `new PrismaClient()` çağrısını argümansız kabul etmiyor.
Üretilen tipteki `PrismaClientOptions` tam olarak iki seçenekli bir birleşim:

```ts
PrismaClientOptions = PrismaClientOptionsWithAccelerateUrl | PrismaClientOptionsWithAdapter
```

Orkestra Şefi tarafından depoda bağımsız doğrulandı — `new PrismaClient()` içeren bir dosya
`tsc --noEmit` altında `TS2554: Expected 1 arguments, but got 0` veriyor. Yani bu bir tercih
değil, derleme zamanı zorunluluğu. `src/server/db.ts` ve `/api/v1/health` bu yüzden yazılamadı;
F1'in tamamı (servis katmanı, auth, tüm mutasyonlar) bu bağlantıya bağlı olduğu için engel kritik.

İki yoldan biri seçilmek zorunda:
- `accelerateUrl` — Prisma'nın ücretli bulut bağlantı havuzu servisi
- `adapter` — yerel sürücü adaptörü; PostgreSQL için `@prisma/adapter-pg`, o da `pg`'ye bağlı

### Karar
**Sürücü adaptörü yolu seçilmiştir.** Şu üç paket kurulur:

| Paket | Tür | Gerekçe |
|-------|-----|---------|
| `@prisma/adapter-pg` | dependency | Prisma 7'de PostgreSQL çalışma zamanı bağlantısı için zorunlu |
| `pg` | dependency | Adaptörün peer bağımlılığı |
| `@types/pg` | devDependency | `pg` kendi tiplerini taşımıyor; §2 "strict, `any` yasak" kuralı için gerekli |

ADR-004'ün "yeni bağımlılık eklenmez" kuralı **kaldırılmaz**; bu, kuralın kendi öngördüğü
istisna yoluyla (rapor → Orkestra Şefi onayı → ADR) işletilmiş bir eklemedir. Kurulumu
Backend ajanı T-003b görevinde yapar.

### Sonuçlar
- **Olumlu:** F1 açılabilir hale gelir. Bağlantı havuzu bizim kontrolümüzde kalır; Coolify'daki Postgres container'ına doğrudan bağlanılır (§13.2). Adaptör, `DATABASE_URL`'i olduğu gibi kullanır — §12'ye yeni anahtar gerekmez.
- **Olumsuz / kabul edilen maliyet:** İki yeni çalışma zamanı bağımlılığı ve `pg` üzerinden gelen geçişli paketler. `pg` havuz ayarları (`max`, `idleTimeoutMillis`) artık bizim sorumluluğumuzda — T-003b'de açıkça ayarlanacak, varsayılana bırakılmayacak. `npm audit` yüzeyi bir miktar genişler (§8.24 CI adımı bunu zaten yakalar).
- Üretim `Dockerfile`'ı (T-070) `pg`'nin yerel bağımlılık gerektirmediğini doğrulamalı — `pg` saf JS'tir, sorun beklenmiyor.

### Alternatifler ve neden reddedildi
- **Prisma Accelerate (`accelerateUrl`)** — Kurulumu tek satır; **reddedildi** çünkü ADR-001'in temel kararıyla doğrudan çelişir: hassas muhasebe ve sağlık verisi üçüncü tarafın bağlantı havuzundan geçerdi, üstelik ücretli bir dış bağımlılık ve tek kullanıcılı bir panel için tamamen gereksiz.
- **Prisma 6'ya geri dönmek** — R8'in tüm kırıcı değişikliklerini ortadan kaldırırdı; **reddedildi** çünkü T-003'ün çalışan migration zinciri, `prisma.config.ts` ve generator yapılandırması yeniden yazılırdı ve projeye ilk haftasında bilerek eskimiş bir major sürüm sabitlenmiş olurdu.
- **`@prisma/adapter-pg` yerine `postgres.js` tabanlı bir adaptör** — **reddedildi** çünkü Prisma'nın PostgreSQL için birinci parti ve belgelenmiş adaptörü `adapter-pg`; alternatifi seçmek destek yüzeyini daraltır, karşılığında hiçbir şey kazandırmaz.

---

## ADR-006 — Üretilen Prisma İstemcisi VCS'e Girmez, `postinstall` ile Üretilir

**Durum:** Kabul edildi · 2026-08-04
**Tetikleyen:** T-003 kararı K3, talep E3 · **Etkilenen:** T-004 (CI), T-070 (Dockerfile)

### Bağlam
Prisma 7 generator'ı TypeScript **kaynağı** üretiyor ve çıktı yolu açıkça verilmek zorunda.
Backend bu çıktıyı `src/server/generated/prisma/` altına koyup `.gitignore`'a ekledi.
Doğru karar — üretilmiş kaynak sürüm kontrolüne girmez. Ancak bir yan etkisi var: taze bir
klonda `pnpm install && pnpm typecheck` kırılır, çünkü istemci henüz yoktur. Şu anda hiçbir
dosya istemciyi import etmediği için sorun görünmüyor; T-003b'de `db.ts` yazılır yazılmaz
ortaya çıkacak ve **Güvenlik ajanının CI hattını (T-004) ilk çalıştırmada düşürecek**.

### Karar
Üretilen istemci `.gitignore`'da kalır. `package.json`'a `postinstall: "prisma generate"`
eklenir; böylece istemcinin varlığı kurulum adımının garantisi olur. Yanında geliştirici
kolaylığı script'leri de eklenir:

```json
"db:up":       "docker compose -f docker-compose.dev.yml up -d",
"db:down":     "docker compose -f docker-compose.dev.yml down",
"db:migrate":  "prisma migrate dev",
"db:generate": "prisma generate",
"db:studio":   "prisma studio",
"postinstall": "prisma generate"
```

Bu değişikliği Backend ajanı T-003b'de yapar — `package.json` ortak dosyadır, işbu ADR onayıdır.

### Sonuçlar
- Taze klon, CI ve Docker build'i tek yoldan çalışır: `pnpm install` istemciyi de üretir.
- `postinstall`, şema olmadan çalışırsa hata verir; `prisma/schema.prisma` repoda olduğu için bu durum oluşmaz.
- T-004 CI hattı `pnpm install` sonrası ayrıca `prisma generate` çağırmak zorunda **değildir** — çağırsa da zararsızdır.
- T-070 Dockerfile'ında `postinstall` build aşamasında çalışır; üretim imajında `prisma` CLI'ın bulunması gerekir (çok aşamalı build'de build katmanında yeterli).

### Alternatifler ve neden reddedildi
- **Üretilen istemciyi repoya commit'lemek** — CI'da hiçbir ek adım gerekmezdi; **reddedildi** çünkü binlerce satır türetilmiş kod her şema değişikliğinde diff'i kirletir ve şema ile istemcinin sessizce uyumsuz kalması mümkün hale gelir.
- **Her ajanın/CI adımının elle `prisma generate` çağırması** — **reddedildi** çünkü unutulabilir bir adım; unutulduğunda alınan hata (`Cannot find module`) nedeni belirsiz görünür ve zaman kaybettirir.

---

## ADR-007 — `prisma.config.ts` Backend Mülkiyetindedir

**Durum:** Kabul edildi · 2026-08-04
**Tetikleyen:** T-003 raporu, kapsam eki E2

### Bağlam
Prisma 7, `datasource` bloğundaki `url` alanını kaldırdı; migrate ve introspect komutlarının
kullandığı bağlantı dizesi artık `prisma.config.ts` içinde yaşıyor. Bu dosya olmadan hiçbir
migrate komutu çalışmıyor ve CLI onu **proje kökünde** arıyor — `prisma/` altına taşınamıyor.
Kök dizinde durduğu için PROGRAM.md §10.1'in yol tabanlı mülkiyet tablosunda karşılığı yok;
T-003 görev kartında da listeli değildi, Backend bilgilendirme notuyla oluşturdu.

### Karar
`prisma.config.ts` **Backend ajanının** mülkiyetindedir — `prisma/**` ile aynı kategoride sayılır,
kök dizinde durması bunu değiştirmez. Ortak dosya olarak işaretlenmez; Backend onay almadan
düzenleyebilir. PROGRAM.md §10.1 tablosuna Backend satırına eklenecek
*(PROGRAM.md güncellemesi F0 sonunda toplu yapılacak).*

Dosyanın içindeki `process.loadEnvFile()` çözümü de onaylanmıştır: Prisma 7 CLI `.env`'i
kendiliğinden yüklemiyor ve Node 20.12+ yerleşiği bunu ek bağımlılık olmadan karşılıyor
(`dotenv` kurulsaydı ADR-004 ihlali olurdu).

### Sonuçlar
- Backend, migration yapılandırmasını tek başına yönetebilir; her değişiklik için Orkestra Şefi'ne uğramaz.
- Güvenlik ajanı bu dosyayı denetim kapsamında sayar (bağlantı dizesi ve `.env` yükleme mantığı §8.17/§8.20 ile ilgilidir) ama **düzenleyemez** — bulgu açar.
- §10.1 tablosu kök dizindeki dosyalar için eksik kalıyor; F0 sonu PROGRAM.md güncellemesinde `prisma.config.ts` ve `docker-compose.dev.yml` Backend'e, `next.config.ts` ortak dosyalara açıkça yazılacak.

### Alternatifler ve neden reddedildi
- **Ortak dosya ilan etmek** — Kökte durduğu için ilk bakışta tutarlı görünürdü; **reddedildi** çünkü içeriği tamamen Prisma'ya özgü ve yalnızca Backend'i ilgilendiriyor. Ortak ilan etmek, her migration ayarı için gereksiz bir onay turu yaratırdı.
- **Güvenlik ajanına vermek** (bağlantı dizesi içeriyor diye) — **reddedildi** çünkü dosya sır tutmuyor, `.env`'den okuyor; mülkiyeti şemayla birlikte tutmak tutarlılığı korur.

---

## ADR-008 — Node.js 22 LTS'e Yükselme (Node 20 EOL)

**Durum:** Kabul edildi · 2026-08-05
**Tetikleyen:** T-004 notu T3, karar K6 · **İlgili risk:** R14

### Bağlam
Depo `engines: ">=20.11.0"` ile açıldı ve geliştirme makinesi Node 20.20 kullanıyor.
T-004'te bunun ilk somut bedeli ödendi: `jsdom@30` Node ≥22.22 istediği için kurulamadı
ve Güvenlik ajanı `jsdom@26.1.0`'a sabitlemek zorunda kaldı (K6).

Asıl mesele sürüm sabitlemesi değil: **Node 20'nin destek penceresi Nisan 2026'da kapandı.**
Bugün (2026-08-05) itibarıyla güvenlik yaması almıyor. §8'in tamamı yamalanmış bir çalışma
zamanı varsayıyor; §8.24 "yüksek/kritik açıkla merge yok" diyor ama çalışma zamanının kendisi
yamasızsa bu kapı anlamını yitirir.

Ayrıca T-004 haklı olarak şuna işaret etti: CI (T-005) ve Docker taban imajı (T-070) sürümü
**bağımsız** seçerse "yerelde çalışıyor, CI'da çalışmıyor" sınıfı hatalar çıkar. Sürüm tek
yerden sabitlenmeli.

### Karar
Proje **Node.js 22 LTS**'e yükselir. Üç yer birlikte sabitlenir ve birbirinden sapamaz:

| Yer | Ne yapılır | Kim |
|-----|-----------|-----|
| `package.json` → `engines.node` | `">=22.11.0"` | Güvenlik (T-005, yetkilendirildi) |
| `.nvmrc` | `22` | Güvenlik (T-005) |
| GitHub Actions `setup-node` | `node-version-file: .nvmrc` | Güvenlik (T-005) |
| `Dockerfile` taban imajı | `node:22-alpine` | Backend (T-070) |

`.nvmrc` tek kaynak; CI onu okur, Docker'ın oradan sapması T-070'te denetlenir.
Yükseltme sonrası `jsdom` sabitlemesi (T-004/K6) kaldırılabilir — zorunlu değil, T-005'in kararı.

**Kullanıcı eylemi gerekli:** yerel makinede Node 22 kurulmalı (`nvm install 22` / `fnm use 22`).
T-005 bundan önce koşturulmamalı, yoksa `engines` kapısı yerel kurulumu reddeder.

### Sonuçlar
- **Olumlu:** Yamalanmış çalışma zamanı; §8.24'ün kapısı anlamlı hale gelir. `jsdom` gibi modern paketler sürüm düşürmeden kurulur. Node 22 LTS penceresi projeyi F7'nin epey ötesine taşır.
- **Olumsuz / kabul edilen maliyet:** Yerelde tek seferlik kurulum. `pnpm install` bir kez yeniden koşacak; `argon2` ve `pg` yerel derleme gerektirmediği için sürpriz beklenmiyor (T-003b'de `pg`'nin saf JS olduğu doğrulanmıştı).
- Node 24 değerlendirildi ve **F7'ye ertelendi**: dağıtım öncesi taban imaj seçimi yeniden gözden geçirilecek.

### Alternatifler ve neden reddedildi
- **Node 20'de kalmak** — Hiçbir şey değişmez, hemen ilerlenir; **reddedildi** çünkü EOL bir çalışma zamanını üretime çıkarmak §8'in tamamıyla çelişir ve karar F7'de, geri dönüşü daha pahalıyken yine karşımıza çıkardı.
- **Node 24 LTS** — En uzun destek penceresi; **şimdilik reddedildi** çünkü Node 22'ye göre sahada daha az denenmiş ve F0'ın ortasında sürpriz uyumsuzluk riskini almanın karşılığı yok. F7'de yeniden değerlendirilecek.
- **Sürümü sabitlemeyip yalnızca `jsdom`'u düşürmek** — Semptomu geçirir, nedeni bırakır; **reddedildi** çünkü aynı çatışma her modern pakette tekrar çıkar.

---

## ADR-009 — Repo GitHub'da, CI GitHub Actions ile

**Durum:** Kabul edildi · 2026-08-05
**Tetikleyen:** Q3 · **Bağlayan:** T-005, T-071

### Bağlam
PROGRAM.md §10.5 dal ve commit düzenini tanımlıyor, §13.4 "Git push → otomatik build & deploy"
diyor, ama barındırmanın nerede olduğu hiçbir yerde yazmıyor. T-005'in (CI hattı) tamamı buna
bağlı: §8.18 (gizli bilgi taraması), §8.24 (`npm audit` kapısı) ve §9 (Lighthouse CI eşikleri)
bir CI koşucusu olmadan uygulanamaz.

### Karar
Repo **GitHub**'da barınır, CI **GitHub Actions** ile kurulur. Hattın sırası §10.5 ve §10.6'dan
türetilir ve T-004'te uçtan uca doğrulanmış hâliyle sabitlenir:

```
pnpm install → lint → typecheck → test (kapsam) → build → test:e2e
```

Herhangi biri düşerse merge yok (§10.6). Coolify, GitHub'dan otomatik deploy çeker (§13.4).

CI ortamı hakkında T-003b/T-004'te doğrulanan gerçekler hatta yazılıdır:
- `.env` **yok** (§8.17) — `pnpm install` ve `pnpm build` bunu tolere etmeli (T-003c'nin konusu)
- `pnpm install` sonrası ayrıca `prisma generate` çağırmaya gerek yok (ADR-006)
- `pnpm build` DB'ye bağlanmaz → CI'da Postgres servisi başlatmaya gerek yok
- Yalnızca `pnpm db:migrate` çalıştıran bir iş eklenirse DB gerekir

### Sonuçlar
- §8.18 (gizli bilgi taraması) ve §8.24 (`npm audit` kapısı) hazır eylemlerle kurulabilir; Lighthouse CI'ın resmî GitHub entegrasyonu var (§9).
- `main` dalı korumaya alınır: doğrudan push yok, hat yeşil olmadan merge yok (§10.5).
- **Gerçek `DATABASE_URL` asla CI secret'ı yapılmaz.** Derlemenin DB'ye ihtiyacı yoktur; bunu secret'a çevirmek T-004'ün BULGU-002'de işaret ettiği tam olarak yanlış refleksti. Migration çalıştıran bir iş eklenirse ayrı ve dar yetkili bir bağlantı dizesi kullanılır.
- Kod GitHub'da barınacağı için `.env`'in repoya hiç girmemesi (§8.17) artık yalnızca hijyen değil, dış maruziyet meselesi.

### Alternatifler ve neden reddedildi
- **Kendi sunucuda Gitea + Coolify build hook** — Tam kontrol ve hiçbir dış bağımlılık; **reddedildi** çünkü Lighthouse CI, `npm audit` kapısı ve gizli bilgi taraması elle kurulurdu ve tek kişilik bakımda bu adımlar ilk sıkışıklıkta atlanır. Ayrıca kod zaten public bir portföy projesi.
- **CI'ı tamamen Coolify build hook'una gömmek** — Tek yerde toplanırdı; **reddedildi** çünkü kapı deploy anında çalışırdı: hatayı merge'den önce değil, dağıtım sırasında görürdük — §10.6'nın amacının tersi.

---

## ADR-010 — Kendi Cookie Tabanlı Tema Sağlayıcısı (`next-themes` Kullanılmaz)

**Durum:** Kabul edildi · 2026-08-05
**Tetikleyen:** T-002 raporu, karar K1

### Bağlam
T-002'nin kabul kriteri açıktı: tema anahtarı **cookie tabanlı** olacak, `localStorage`
değil, ve **FOUC olmayacak**. Frontend ajanı `next-themes@0.4.6`'nın kaynağını inceleyip
iki yapısal engel buldu:

1. `next-themes` yalnızca `localStorage.getItem/setItem` kullanıyor — cookie desteği yok,
   kaynak kodda "cookie" kelimesi hiç geçmiyor. Kriter bu paketle **karşılanamıyor**.
2. FOUC'u bir **inline `<script>`** ile çözüyor. §8.13 `unsafe-inline` script'i yasaklıyor;
   bu yol seçilseydi F6/T-060'ta nonce borcu doğardı — CSP'yi bileşene uydurmak yerine
   bileşeni CSP'ye uydurmak zorunda kalırdık.

`next-themes` ADR-004 kapsamında T-001'de kurulmuştu; o an bu iki kısıt bilinmiyordu.

### Karar
`next-themes` **kullanılmaz**. Yerine ~90 satırlık kendi sağlayıcımız kullanılır:

| | |
|---|---|
| Cookie | `sahinsamet-tema` · `path=/` · `max-age=31536000` · `SameSite=Lax` · `Secure` (yalnız HTTPS) |
| Değerler | `'light' \| 'dark' \| 'system'` |
| `<html>` sınıfı | `light` / `dark` / (system'de sınıf yok) |
| FOUC | Sunucuda basılır — inline script **yok**, nonce gerekmiyor |
| JS kapalıyken | `@media (prefers-color-scheme: light)` devreye girer |
| API | `useTheme() → { theme, resolvedTheme, setTheme }` |

`next-themes` paketi `package.json`'dan **kaldırılır** — kullanılmayan bir bağımlılık
gereksiz saldırı yüzeyi ve sonraki bir ajan için yanıltıcı bir sinyaldir. Kaldırma işi
Backend'e verilir (T-010 ile birlikte); Frontend ADR-004 gereği `package.json`'a dokunmadı — doğru davranış.

### Sonuçlar
- **Olumlu:** Her iki kriter de yapısal olarak sağlanıyor — FOUC "önlenmiş" değil, mümkün değil. §8.13 borcu doğmuyor. Kötü niyetli cookie değeri (`<script>alert(1)</script>`) güvenli düşüşle sınıfsız kalıyor; test edilmiş.
- **Olumsuz / kabul edilen maliyet:** ~90 satır kendi kodumuz; `next-themes`'in sistem tercihi dinleyicisi, çoklu sekme senkronizasyonu gibi olgunlaşmış ayrıntılarını kendimiz taşıyoruz. `resolvedTheme` ilk render'da `undefined` — sunucu sistem tercihini bilemez, bu kaçınılmaz ve tüketiciler bunu hesaba katmalı.
- Bu karar ADR-011'i doğrudan tetikledi: cookie'yi kök layout'ta okumak tüm rotaları dinamik render'a çekti.

### Alternatifler ve neden reddedildi
- **`next-themes`'i `localStorage` ile kullanmak** — Paket hazır ve olgun; **reddedildi** çünkü kabul kriteriyle doğrudan çelişir ve `localStorage` sunucuda okunamadığı için FOUC ancak inline script'le önlenir — yani ikinci sorunu da beraberinde getirir.
- **`next-themes` + nonce'lu inline script** — Teknik olarak mümkün; **reddedildi** çünkü F6'ya kadar taşınacak bir CSP borcu yaratır ve çözdüğü sorun (cookie desteği) yine çözülmemiş kalır.
- **Tema anahtarını tamamen kaldırıp yalnızca `prefers-color-scheme`'e güvenmek** — En basit yol; **reddedildi** çünkü §3'ün "kullanıcı tercihi **+** sistem tercihi" gereğini karşılamaz.

---

## ADR-011 — Dinamik Render Kabul Edilir; Önbellek Veri Katmanında Çözülür

**Durum:** Kabul edildi · 2026-08-05
**Tetikleyen:** T-002 raporu · **İlgili risk:** R16

### Bağlam
ADR-010'un sonucu olarak kök layout tema cookie'sini `cookies()` ile okuyor. Next 15'te bu
çağrı **tüm rotaları** statik üretimden çıkarıyor: T-001'de `○ /` (static) olan build çıktısı
artık `ƒ /` (dynamic). §1.1 K1 (LCP < 2.0s) ve SEO doğrudan bu katmana bakıyordu.

Karar spekülasyonla değil ölçümle veriliyor: T-005'te Lighthouse ilk kez koştu ve
**Performance 91** ölçtü — §9 eşiği ≥ 90 zaten sağlanıyor, üstelik dinamik render altında.

Ayrıca §13'te CDN yok; sayfalar kendi sunucumuzdan servis ediliyor. Statik üretimin asıl
kazancı bu mimaride "dosyayı diskten ver" değil, "**veriyi tekrar tekrar sorgulama**".

### Karar
Dinamik render **kabul edilir**. Statik üretimi geri kazanmak için tema mimarisi bozulmaz.

Karşılığında bir koruma zorunlu kılınır: **F2'den itibaren public sayfaların veri erişimi
açık önbellekleme ile yazılır** — `unstable_cache` (veya güncel eşdeğeri) + etiket tabanlı
`revalidateTag`. Panelden içerik yayınlandığında ilgili etiket geçersizleştirilir (§7.1'in
`revalidatePath` akışıyla birlikte). Böylece her istekte DB'ye gidilmez; asıl maliyet kalemi
kapatılır.

Karar **T-029'da yeniden ölçülür**: gerçek ana sayfa ve gerçek içerikle Lighthouse tekrar
koşacak. Performance < 90'a düşerse bu ADR yeniden açılır.

### Sonuçlar
- **Olumlu:** Tema mimarisi (ADR-010) bozulmadan kalıyor; FOUC ve CSP borcu üretilmiyor. Ölçülen performans eşiği zaten sağlıyor.
- **Olumsuz / kabul edilen maliyet:** Her istek sunucuda render ediliyor (küçük sayfada birkaç ms). ISR'ın "sayfayı tamamen hazır tut" kazancından vazgeçiliyor. Önbellekleme artık **açık bir sorumluluk** — unutulursa her ziyaret DB'ye gider. Bu yüzden F2 görev kartlarına kabul kriteri olarak yazılır, ajanın hatırlamasına bırakılmaz.
- Panel tarafı zaten dinamik olmalıydı (kişiye özel veri) — orada kayıp yok.

### Alternatifler ve neden reddedildi
- **Tema sınıfını nonce'lu inline script ile basmak** — Statik üretim geri gelir, FOUC yine olmaz; **reddedildi** çünkü §8.13'e bir nonce borcu yaratır ve ADR-010'un tam olarak kaçındığı yere geri döner. Ölçülen Performance 91 iken bu takası yapmanın karşılığı yok.
- **Cookie'yi yalnızca `(panel)` layout'unda okumak** — Public taraf statik kalırdı; **reddedildi** çünkü açıkça tema seçmiş bir ziyaretçi public sayfada ilk boyamada yanlış temayı görürdü — yani FOUC'u kaldırmayıp yalnızca yerini değiştirirdi.
- **Cookie'yi kaldırıp yalnızca `prefers-color-scheme`** — §3'ün kullanıcı tercihi gereğini karşılamaz (ADR-010'da da reddedilmişti).

---

## ADR-012 — Veri Bağımsız F2 Hazırlığı F1 ile Paralel Yürüyebilir

**Durum:** Kabul edildi · 2026-08-05
**Tetikleyen:** T-002b sonrası Frontend'in boşta kalması · **İlgili risk:** R11

### Bağlam
PROGRAM.md §11 net: *"Bir faz bitmeden sonraki faza geçilmez."* Kural, kararsız bir temelin
üstüne inşa etmeyi engellemek için var ve F0 boyunca değerini kanıtladı.

Ancak F0 kapanırken şu tablo oluştu: F1'in ilk görevi T-010 (tam §6 Prisma şeması) **R11
yüzünden açılamıyor** — beş veri modeli kararı (A1, A4, B7, C2, C6) kullanıcıdan gelmedi.
Bu arada Frontend'in sıradaki işi T-020 (React Bits kurulumu ve token uyumlaması) veri
katmanına **hiç dokunmuyor**: bileşenleri `src/components/reactbits/` altına alıp sabit
renklerini token'larla değiştirmek, `next/dynamic` ile sarmak ve bundle etkisini ölçmek.
Kuralı harfiyen uygularsak Frontend, hiçbir teknik bağımlılığı olmayan bir beklemeye girer.

### Karar
§11'in faz sırası kuralı **korunur**, dar bir istisnayla: bir sonraki fazın görevlerinden
**mevcut fazın çıktılarına sıfır bağımlılığı olanlar** paralel yürütülebilir. Koşullar:

1. Görev, açık fazın hiçbir çıktısını (şema, tip, servis, endpoint) tüketmez.
2. Görev, açık fazın ajanlarıyla **dosya kesişimi** yaratmaz (§10.1).
3. Paralel yürütme kararını Orkestra Şefi verir ve görev kartında **açıkça** belirtir.
4. **Faz kabul kapısı değişmez:** F1, kendi kabul kriterleri sağlanmadan kapanmaz;
   paralel yürüyen F2 görevi F1'i "kapanmış" saydırmaz.

İlk uygulama: **T-020**, F1/T-010 ile paralel.

### Sonuçlar
- **Olumlu:** Bir ajanın, kendisini ilgilendirmeyen bir karar beklerken boşta kalması önlenir. T-020'nin erken yapılması F2'nin en büyük bilinmeyenini (React Bits bundle maliyeti, §5.2.6'nın 40KB eşiği) öne çeker — geç öğrenilmesi pahalı bir bilgi.
- **Olumsuz / kabul edilen maliyet:** "Faz" kavramı bir miktar bulanıklaşır; STATUS.md'de hangi görevin hangi faza ait olduğu ve neden paralel koştuğu açıkça yazılmazsa takip zorlaşır. Bu yüzden 3. koşul (görev kartında açık beyan) zorunlu tutuldu.
- Kural **kötüye kullanılmaya açıktır**: "bu da bağımsız sayılır" diyerek fazlar iç içe geçebilir. 1. ve 2. koşul bunu sınırlıyor; şüphe varında paralel yürütülmez.

### Alternatifler ve neden reddedildi
- **§11'i harfiyen uygulayıp Frontend'i bekletmek** — En temiz disiplin; **reddedildi** çünkü beklemenin teknik bir gerekçesi yok; gerekçe yalnızca kuralın lafzı. Kuralın amacı (kararsız temel üstüne inşa etmemek) T-020'de zaten ihlal edilmiyor.
- **§11'i tamamen kaldırıp serbest paralellik** — **reddedildi** çünkü faz kapıları F0'da işe yaradı: her fazın sonunda yapılan kabul kontrolü BULGU-002 ve BULGU-003 gibi kalemleri yakaladı. Kapıyı kaldırmak bu mekanizmayı da kaldırır.
- **F1'i R11 olmadan başlatmak** — **reddedildi** çünkü T-010 tam şemayı yazacak; beş karar sonradan gelirse şema ve migration ikinci kez yazılır. Backend bunu dört raporda üst üste uyardı.

---

## ADR-013 — Auth: JWT Session, TOTP Kurtarma Kodu, `LoginAttempt` Tablosu

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** A1, A2, A3 · **İlgili risk:** R3

### Bağlam
Backend'in T-000 değerlendirmesi üç kalemde şemanın kendi içinde tutarsız olduğunu gösterdi:

- **A1:** §2 "Credentials + TOTP" diyor, §6 ise "`Session`, `VerificationToken` — Auth.js standardı".
  Auth.js v5'te Credentials provider **yalnızca JWT** session stratejisiyle çalışır; PrismaAdapter'ın
  DB session'ı Credentials ile kullanılamaz. Adapter ayrıca `Account`, `User.emailVerified`,
  `User.image` alanlarını zorunlu kılar — §6'da yoklar. Yani §6 çalışmayacak bir şema tarif ediyor.
- **A2:** §8.1 2FA'yı zorunlu açık getiriyor, ama kurtarma kodu yok. Tek kullanıcılı sistemde
  telefon kaybı = panele tam kilitlenme; tek çıkış DB'ye elle müdahale. R3 bunu F0'da zaten
  risk olarak kaydetmişti. Ayrıca `totpSecret` düz metin saklanırsa DB yedeği (§8.21) sızdığında
  ikinci faktör tamamen değersizleşir.
- **A3:** §8.4 "IP başına 15 dakikada 5 deneme, aşımda 15 dk kilit + **log**" istiyor ama
  karşılığı bir model yok. Bellek içi sayaç Docker yeniden başlatmada sıfırlanır — gereksinim
  sağlanmış görünür, sağlanmaz.

### Karar
**A1 — JWT stratejisi.** `session: { strategy: 'jwt' }`. `Session` ve `VerificationToken`
modelleri şemadan **çıkarılır**; `Account` eklenmez. PrismaAdapter kullanılmaz — tek kullanıcılı
Credentials akışında hiçbir şey kazandırmıyor. Oturum çerezi §8.3'teki bayrakları taşır
(`httpOnly`, `secure`, `sameSite: lax`, 7 gün).
> ⚠️ **7 gün ADR-035/A ile 24 SAATE indirildi (T-046).** Bu satır kararın o günkü
> hâlini kaydediyor; yürürlükteki değer ADR-035'tedir. Ayrıca ADR-013'ün
> satır 545'te öngördüğü `iat` + toplu geçersizleştirme mekanizması ADR-035/B
> ile — `sessionsValidFrom` değil `writesValidFrom` adıyla — uygulandı.

**A2 — Kurtarma kodları ve şifreli secret.** `User` şu alanları kazanır:
`totpBackupCodes String[]` (her biri **argon2id ile hash'li** — düz saklanmaz),
`totpConfirmedAt DateTime?` (kurulum tamamlanmadan 2FA zorunlu sayılmaz),
`totpSecret` **uygulama seviyesinde şifreli** saklanır (yeni env anahtarı: `TOTP_ENCRYPTION_KEY`).
Kod bir kez kullanılır ve tüketilir. Kurtarma prosedürü `docs/security/restore.md`'ye yazılır (§8.22).

**A3 — `LoginAttempt` tablosu + sınır.** Model **Backend'in** (`prisma/**`):
`ip`, `emailHash` (ham e-posta değil — §8.20), `success`, `createdAt`, `@@index([ip, createdAt])`.
Sayma ve kilitleme **mantığı** Güvenlik ajanının (`src/lib/security/**`); okuma/yazma
Backend'in yazdığı bir servis üzerinden yapılır. Yani: **tablo ve servis Backend, politika Güvenlik.**
Kilit durumu ayrıca `User.lockedUntil DateTime?` ile taşınır.

### Sonuçlar
- §6'nın çalışmayan kısmı düzeltildi; F1 baştan yazılmaktan kurtuldu.
- Şema küçüldü: iki model eksildi, adapter bağımlılığı kalktı.
- **Yeni env anahtarı** `TOTP_ENCRYPTION_KEY` — §12'ye eklenecek. Kaybolursa 2FA secret'ları açılamaz; `BACKUP_ENCRYPTION_KEY` ile aynı ciddiyette saklanmalı.
- JWT ile "oturumu sunucudan sonlandırma" doğrudan mümkün değil. Tek kullanıcı için kabul edilebilir; gerekirse token `iat` + `User.sessionsValidFrom` karşılaştırmasıyla toplu geçersizleştirme eklenir (v1'de yok).
- `LoginAttempt` büyür: 90 günden eski kayıtlar gece işiyle temizlenir (§8 KVKK yönü, C10 ile birlikte).

### Alternatifler ve neden reddedildi
- **PrismaAdapter + DB session** — §6'nın lafzına uyardı; **reddedildi** çünkü Auth.js v5'te Credentials ile teknik olarak çalışmıyor. Lafza uymak için çalışmayan kod yazılmaz.
- **Kurtarma kodu yerine "e-posta ile sıfırlama"** — **reddedildi** çünkü e-posta hesabı ele geçirilirse 2FA tamamen atlanır; ikinci faktörün amacını ortadan kaldırır.
- **Hız sınırlamayı bellekte tutmak** — Basit ve hızlı; **reddedildi** çünkü §8.4 açıkça **log** istiyor ve yeniden başlatmada sıfırlanan bir sayaç denetlenebilir değil.

---

## ADR-014 — Para Birimi: Kur Snapshot'ı; KDV/Stopaj v1 Kapsamı Dışı; `Decimal` → `string` DTO

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** A4, B8, D · **İlgili risk:** R4

### Bağlam
**A4:** `Transaction.amount Decimal(12,2)` + `currency` var, kur alanı yok. USD bir tahsilat
girildiğinde "aylık gelir toplamı" — §9'un **test edilmesini istediği** hesaplama — matematiksel
olarak üretilemiyor. Kritik olan şu: kur **işlem anına** aittir; sonradan eklenirse geçmiş
kayıtlara doğru kur atanamaz, yani veri kurtarılamaz hale gelir.

**B8:** `agreedAmount` var ama kısmi ödeme, kalan bakiye, KDV, stopaj yok.

**D:** Prisma `Decimal`, JS tarafında `Decimal.js` nesnesi döner ve Server Component →
Client Component sınırında **serialize edilemez** — frontend çalışma zamanı hatası alır.
R4 bunu F0'da risk olarak kaydetmişti.

### Karar
**A4 — Kur snapshot'ı (kullanıcı onayı ile).** `Transaction` ve `Job` şu alanları kazanır:
`fxRate Decimal(18,8)` (işlem anındaki kur, TRY bazlı) ve `baseAmount Decimal(12,2)` (TRY karşılığı).
**Tüm toplama, raporlama ve grafik `baseAmount` üzerinden yapılır**; `amount` + `currency`
yalnızca kaydın kendi gerçeğini gösterir. TRY işlemlerde `fxRate = 1.0`, `baseAmount = amount`.

**B8 — KDV ve stopaj v1 kapsamı dışı (kullanıcı onayı ile).** §1.2 zaten e-fatura
entegrasyonunu kapsam dışı bırakıyor. `agreedAmount` brüt tutardır. **Tahsil edilen ve kalan
bakiye ayrı sütun olarak tutulmaz** — bağlı `Transaction` toplamından türetilir. Tek doğruluk
kaynağı korunur; iki yerde tutulup birbirini tutmayan tutar sorunu doğmaz.

**D — DTO sınırında `string`.** Servis katmanı dışarıya `Decimal` **döndürmez**; para alanları
DTO sınırında `string`'e çevrilir (`amount: string`). Bu, Backend'in Frontend'e verdiği
sözleşmenin parçasıdır ve T-015'te dönüştürme yardımcısı olarak yazılır. Formatlama
(binlik ayracı, para simgesi) Frontend'in işidir ve `src/lib/utils` içindeki ortak
formatlayıcıdan geçer.

### Sonuçlar
- Çok para birimli toplamlar ilk günden doğru; geçmiş veri kurtarılabilir kalıyor.
- Kur kaynağı v1'de **elle girilir** (otomatik kur servisi entegrasyonu yok — §1.2 ruhuna uygun). Panelde işlem eklenirken kur alanı görünür ve zorunludur; TRY seçiliyse 1.0 ile gizlenir.
- `baseAmount` türetilmiş bir alandır ama **saklanır** — hesaplanarak tutulsaydı geçmiş kurları yeniden bulmak gerekirdi.
- KDV kararı geri dönülebilir: `vatRate` sonradan nullable eklenebilir, geçmiş veriyi bozmaz. Bu yüzden v1'de dışarıda bırakmak ucuz.
- R4 kapanır; `Decimal` sızıntısı yapısal olarak engellenir.

### Alternatifler ve neden reddedildi
- **Yalnızca TRY, `currency` alanını kaldır** — En basit; **reddedildi** çünkü kullanıcı yabancı para birimiyle iş aldığını belirtti ve sonradan eklemek geçmiş veriye kur atama sorunu doğurur.
- **Kuru işlem anında saklamak yerine sorgu anında hesaplamak** — **reddedildi** çünkü geçmiş kurları güvenilir biçimde geri getirmek dış servis ve tarih bazlı sorgu gerektirir; üstelik rapor her koşuda farklı sonuç verirdi.
- **`Job` üzerinde `paidAmount` / `remainingAmount` sütunları** — Sorguyu basitleştirirdi; **reddedildi** çünkü aynı bilgi iki yerde tutulur ve er geç birbirini tutmaz. §6'nın "aynı veri iki yere girilmez" ilkesiyle çelişir.
- **`Decimal` yerine tamsayı kuruş** — Serileştirme sorununu da çözerdi; **reddedildi** çünkü §6 açıkça `Decimal(12,2)` diyor ve tamsayı kuruş her okuma/yazmada dönüştürme hatası riski taşır.

---

## ADR-015 — Tekrarlayan İşlem Ayrı Model + Idempotent Üretim

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** A5

### Bağlam
§6'da `Transaction.isRecurring` + `recurrenceRule` var; ama `nextRunAt`, `lastGeneratedAt`
ve üretilen kayıtta kaynağa referans yok. §13.5 gece cron'u tanımlıyor. Cron iki kez
çalışırsa (yeniden deneme, dağıtım sırasında çakışma, elle tetikleme) **çift kayıt** oluşur
ve muhasebe sessizce bozulur. Sessiz bozulma, gürültülü hatadan çok daha pahalıdır — çünkü
aylar sonra fark edilir ve hangi kaydın fazladan olduğu belli olmaz.

Ayrıca şablon ile üretilen kaydı aynı tabloda tutmak kavramsal olarak yanlış: şablon bir
**kural**, üretilen ise bir **olay**. Aynı tabloda durunca her sorguya `isRecurring = false`
filtresi eklemek gerekir ve bu filtre er geç unutulur.

### Karar
Şablon ayrı bir modele taşınır: **`RecurringTransaction`** — `type`, `amount`, `currency`,
`categoryId`, `description`, `method`, `recurrenceRule`, `nextRunAt`, `lastGeneratedAt`,
`isActive`, `startDate`, `endDate?`.

Üretilen `Transaction` kaydı `sourceRecurringId String?` taşır ve idempotanslık
**veritabanı düzeyinde** garanti edilir:

```
@@unique([sourceRecurringId, periodKey])
```

`periodKey` üretim dönemini temsil eden deterministik bir dize (örn. `2026-08`).
Cron ikinci kez çalışırsa ikinci ekleme **unique ihlaliyle reddedilir** — uygulama mantığına
güvenilmez. `Transaction.isRecurring` ve `recurrenceRule` alanları kaldırılır.

### Sonuçlar
- Çift kayıt uygulama hatasıyla değil, veritabanı kısıtıyla engellenir. Cron'un "en az bir kez" garantisi yeterli hale gelir; "tam bir kez" garantisi aranmaz.
- Şablon düzenlemek geçmiş kayıtları etkilemez — doğru davranış: geçen ayın kirası değişmez.
- `periodKey` üretim kuralı servis katmanında tek bir yardımcıda toplanır ve birim testi yazılır (§9 "hesaplama içeren her fonksiyon test edilir").
- Bir dönem bilerek atlanmak istenirse `lastGeneratedAt` ileri alınır; ek alan gerekmez.

### Alternatifler ve neden reddedildi
- **Aynı tabloda `isRecurring` bayrağıyla devam** — §6'nın önerdiği yol; **reddedildi** çünkü şablonu olaydan ayırmıyor, her sorguya filtre borcu yüklüyor ve idempotanslık için doğal bir anahtar bırakmıyor.
- **Idempotanslığı uygulama katmanında kontrol etmek** (`önce sorgula, yoksa ekle`) — **reddedildi** çünkü eşzamanlı iki çalıştırmada yarış koşuluna açık; veritabanı kısıtı bu sınıf hatayı tamamen kapatır.
- **Tekrarlayan işlemleri hiç üretmemek, sorgu anında hesaplamak** — **reddedildi** çünkü gerçekleşmemiş bir ödeme ile gerçekleşmiş bir ödeme muhasebede aynı şey değildir; kayıt üretmek doğru modeldir.

---

## ADR-016 — Gün Semantiği `@db.Date`, Tek Zaman Dilimi Yardımcısı

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** A6

### Bağlam
`HealthLog.date`, `HabitLog.date`, `Transaction.date`, `Workout.date`, `JournalEntry.date`
"gün" semantiği taşıyor — saat bilgisi anlamsız. `DateTime` olarak tutulursa Europe/Istanbul
(UTC+3) altında **00:00–03:00 arasında girilen kayıtlar bir önceki güne düşer**.

Somut sonuçları: `HealthLog.date` unique kısıtı beklenmedik biçimde çakışır ya da çakışmaz;
gece 01:00'de girilen bir alışkanlık kaydı önceki güne yazılır ve streak hesabı bozulur;
§9'un test edilmesini istediği "aylık toplam" ay sınırında yanlış sonuç verir. Bu hatalar
gündüz test edildiğinde **hiç görünmez** — en kötü hata sınıfı.

### Karar
Gün semantiği taşıyan tüm alanlar **`@db.Date`** olur (saat bileşeni yok).
Gerçek bir zaman damgası gereken alanlar (`createdAt`, `paidAt`, `deliveredAt`, `lastLoginAt`,
`publishedAt`) `DateTime` kalır — bunlar an bildirir, gün değil.

Gün bazlı tüm hesaplamalar (ay başı/sonu, hafta başlangıcı, streak, "bugün") **tek bir
zaman dilimi yardımcısından** geçer, sabit `Europe/Istanbul`.

> **Konum revizyonu (2026-08-10, T-015/K1):** Yardımcı `src/server/services/_shared/app-date.ts`
> içinde uygulandı — `src/lib/utils/date.ts` değil. Gerekçe: gün hesabı bugün yalnızca sunucu
> tarafında kullanılıyor ve `src/lib/utils/` Frontend'in dizini. İçerik ve davranış bu ADR'ye
> birebir uyuyor.
> **Bağlayıcı kural:** Frontend **kendi gün yardımcısını yazmaz.** Tarih seçici veya "bugün"
> gibi bir ihtiyaç doğarsa yardımcı ortak bir konuma (`src/lib/utils/date.ts`) taşınır ve iki
> taraf da oradan içe aktarır. İki ayrı uygulama, bu ADR'nin önlemek için var olduğu hatanın
> ta kendisidir.
Servislerde doğrudan `new Date()` ile gün hesabı yapılmaz. Bu yardımcı birim testi yazılan
ilk fonksiyonlardan biridir ve testler **ay sınırı, yıl sınırı ve 00:00–03:00 aralığını**
açıkça kapsar.

### Sonuçlar
- Sınıf olarak bir hata ailesi kapanır; üstelik F1'de, veri birikmeden.
- `HealthLog.date` üzerindeki unique kısıt artık gerçekten "günde bir kayıt" anlamına gelir.
- Yardımcı tek nokta olduğu için yaz saati veya zaman dilimi değişikliği tek yerden ele alınır.
- Maliyet: her gün bazlı sorguda yardımcıyı kullanma disiplini. Kod incelemesinde ve §9 testlerinde denetlenir.

### Alternatifler ve neden reddedildi
- **`DateTime` bırakıp saati 00:00'a normalize etmek** — **reddedildi** çünkü normalizasyonu **hangi** zaman diliminde yaptığın sorusu duruyor; veritabanı tipiyle garanti edilen bir şeyi uygulama disiplinine bırakmak, unutulmaya açık.
- **Her şeyi UTC'de tutup görüntülemede çevirmek** — Yaygın bir yaklaşım; **reddedildi** çünkü "gün" burada bir an değil, kullanıcının yaşadığı takvim günü. UTC'ye çevirmek sorunun kendisini üretiyor.
- **Zaman dilimini kullanıcı ayarı yapmak** — **reddedildi**: tek kullanıcılı sistem, sabit tek zaman dilimi (§1.2 çoklu kullanıcıyı kapsam dışı bırakıyor).

---

## ADR-017 — İlişki ve Bütünlük Düzeltmeleri; `Job.status` ↔ Kanban Eşlemesi

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** B1, B2, B6, B7, C5, C8

### Bağlam
Backend altı ayrı bütünlük açığı buldu. Ortak noktaları: hepsi veri birikmeden düzeltilirse
bedava, biriktikten sonra veri temizliği gerektirir.

### Karar

**B1 — Çift yönlü FK tek yöne indirilir.** `ContactMessage.convertedJobId` **kaldırılır**;
yalnızca `Job.contactMessageId String? @unique` kalır. İki nullable FK, birbirini
göstermeyen iki kayıt üretebilir ve hangisinin doğru olduğu belirsizleşir. Ters yön ilişki
üzerinden okunur.

**B2 — `Client.email String? @unique`.** §6 "mesajdan müşteri kaydı otomatik açılır" diyor;
dedupe olmadan aynı kişi üç kez yazarsa üç müşteri oluşur ve müşteri bazlı muhasebe bozulur.
Otomatik açma akışı **upsert** ile çalışır.

**B6 — Referans verilerde silme yasak, arşivleme var.** `TransactionCategory`, `Exercise`,
`Client`, `Habit` şu alanı kazanır: `isArchived Boolean @default(false)`. Bağlı FK'ler
`onDelete: Restrict`. **Muhasebe kayıtlarında hard delete hiçbir koşulda yapılmaz.**
Panelde "sil" eylemi arşivler; arşivlenmiş kayıt yeni seçim listelerinde görünmez, geçmiş
kayıtlarda görünmeye devam eder.

**B7 — Beş kolonlu kanban (kullanıcı onayı ile).** `Job.status` enum'u §6'daki gibi kalır:
`LEAD` · `PROPOSAL` · `ACTIVE` · `DELIVERED` · `CANCELLED`. Panoda **beşi de kolondur**:
Aday → Teklif → Aktif → Teslim → İptal. §4.2'deki üç kolonlu tarif bu karara göre güncellenir.
Enum ile kolon arasında eşleme katmanı **yoktur** — enum değeri kolonun kendisidir.
Mobilde pano yatay kaydırılır.

**C5 — İndeks ve unique politikası.** Asgari set T-010'da yazılır:
`Post.slug @unique` · `Project.slug @unique` · `@@index([status, publishedAt])` ·
`Transaction: @@index([date, type])`, `@@index([jobId])`, `@@index([categoryId])` ·
`Attachment: @@index([entity, entityId])` · `HabitLog: @@unique([habitId, date])` ·
`WorkoutSet: @@unique([workoutId, exerciseId, setNo])` · `LoginAttempt: @@index([ip, createdAt])`.
`HabitLog` üzerindeki unique **eksikti** — şu hâliyle aynı güne çift kayıt mümkündü.

**C8 — `Profile` tekilliği.** Sabit `id: "singleton"` + `upsert`. İki `Profile` satırı
oluşabilmesi, public tarafın hangisini göstereceğini belirsiz bırakırdı.

### Sonuçlar
- Belirsiz durumlar veritabanı düzeyinde imkânsız hale gelir; uygulama mantığına güven azalır — istenen budur.
- `onDelete: Restrict` panelde "silinemiyor" hatası üretebilir; bu yüzden arşivleme akışı **T-040/T-041'de UI olarak** karşılanmalı, yoksa kullanıcı çıkmaza düşer. Görev kartlarına kriter olarak yazılacak.
- PROGRAM.md §4.2 ve §6 bu kararlara göre güncellenir.

### Alternatifler ve neden reddedildi
- **Çift yönlü FK'yi tutup uygulama katmanında senkron tutmak** — **reddedildi**: iki kaydın tutarlılığını her yazma yolunda garanti etmek gerekir; biri unutulur.
- **Soft delete yerine hard delete + `onDelete: SetNull`** — **reddedildi** çünkü geçmiş bir işlemin kategorisinin `null`'a düşmesi muhasebe raporunu sessizce bozar.
- **Üç kolonlu kanban (§4.2'ye sadık)** — **reddedildi** (kullanıcı kararı): `LEAD` ve `CANCELLED` için kalıcı bir eşleme katmanı gerekirdi ve iptal edilen işler gözden kaybolurdu.

---

## ADR-018 — Dosya Yönetimi: URL Saklanmaz, `Attachment` Tek Mekanizma

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** B3, B4, B5

### Bağlam
**B4 en ciddisi:** `Attachment.url` alanı §8.11 ile doğrudan çelişiyor. §8.11 private bucket
ve 15 dakikalık imzalı URL istiyor. Kalıcı bir `url` sütunu ya **yanlıştır** (süresi dolmuş,
çalışmaz) ya da **tehlikelidir** (public URL saklanmış demektir, yani bucket private değil).
İkisi de kabul edilemez.

**B3:** İki dosya mekanizması yan yana duruyor — `Attachment.entity/entityId` polimorfik ve
`Transaction.attachmentId` gerçek FK. Ayrıca bir işleme genelde birden çok belge iliştirilir
(fatura + dekont); tekil FK yetersiz.

**B5:** `coverUrl`, `avatarUrl`, `cvUrl`, `gallery` düz string. Dosya silindiğinde kırık
link oluşur, kullanılmayan dosya tespiti imkânsız. `Project.gallery` tipi hiç tanımlı değil.

### Karar
**URL saklanmaz.** `Attachment.url` **kaldırılır**. Saklanan: `key String @unique` (R2 nesne
anahtarı), `mime`, `size`, `checksum` (§8.23 bütünlük doğrulaması aynı mekanizmayı kullanır),
`width Int?` / `height Int?` (görsel için — Frontend'in `next/image` ile CLS'i önlemesi
şart, §5.2.3), `uploadedById`, `entity`, `entityId`.
İmzalı URL **istek anında** anahtardan üretilir, TTL 15 dk (§8.11).

**Tek mekanizma:** `Transaction.attachmentId` **kaldırılır**. Tüm ekler polimorfik
`Attachment` üzerinden bağlanır, `@@index([entity, entityId])` ile. Bir işleme birden çok
belge iliştirilebilir. Yetim dosyalar için gece temizlik işi (§13.5 cron'una eklenir).

**Kapak görselleri FK kazanır:** `Project.coverAttachmentId`, `Post.coverAttachmentId`,
`Profile.avatarAttachmentId`, `Profile.cvAttachmentId` — hepsi `onDelete: Restrict`.
Kullanılan bir dosya silinemez. `Project.gallery` **ilişkidir**, scalar değil: polimorfik
`Attachment` kayıtları `entity: "Project"` ile bağlanır ve `order` alanıyla sıralanır.

### Sonuçlar
- §8.11 yapısal olarak sağlanır: saklanan hiçbir şey doğrudan erişim vermiyor.
- Kırık link sınıfı hata kapanır (`Restrict`), yetim dosya tespiti mümkün hale gelir (`key` unique + entity indeksi).
- `width`/`height` saklanması Frontend'in CLS borcunu ortadan kaldırır — §5.2.3 "CLS oluşturmaları yasak" kuralı için gerçek bir dayanak.
- **Maliyet:** her görsel gösteriminde imzalı URL üretimi gerekir. Public sayfalarda bu, ADR-011'in önbellekleme katmanıyla birlikte düşünülmeli — imzalı URL'nin TTL'i önbellek süresinden kısaysa bozuk görsel çıkar. **T-037'nin kabul kriteri olarak yazılacak.**
- Polimorfik ilişkide FK yok; bütünlük uygulama katmanında korunur. Kabul edilen takas — alternatifi her varlık için ayrı ek tablosu.

### Alternatifler ve neden reddedildi
- **`url` alanını tutup imzalı URL'yi oraya yazmak** — **reddedildi**: 15 dakikada bayatlar; saklamak anlamsız.
- **Her varlık için ayrı ek tablosu** (`ProjectAttachment`, `TransactionAttachment`…) — Gerçek FK ve cascade verirdi; **reddedildi** çünkü §6'daki varlık sayısıyla çarpılınca şema şişer ve her yeni varlık yeni tablo gerektirir.
- **`gallery`'yi `String[]` bırakmak** — **reddedildi**: dosya yaşam döngüsünün dışında kalır, silinen görsel sessizce kırılır.

---

## ADR-019 — İçerik Modeli: `locale`, Yayın Durumu, `viewCount`, Etiketler

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** C1, C2, C3, C4

### Bağlam
Dört kalem de "şimdi ucuz, sonra pahalı" sınıfında — ama biri bilinçli olarak **ertelenmeye**
değer, bu yüzden dördü birlikte ele alınıyor.

### Karar

**C1 — `locale` şimdi eklenir.** §1.2 "v1 sadece TR, ama **i18n altyapısı hazır bırakılır**"
diyor. İçerik modelleri (`Project`, `Post`, `Experience`, `Service`, `Skill`, `Profile`)
`locale String @default("tr")` alır; slug kısıtları `@@unique([slug, locale])` olur.
Sonradan eklemek migration + **tüm sorguların** değişmesi demek; şimdi eklemek neredeyse bedava.

**C4 — Yayın durumu genişletilir.** `status` enum'u: `DRAFT` · `SCHEDULED` · `PUBLISHED` ·
`ARCHIVED`. `SCHEDULED` ileri tarihli yayın için (`publishedAt` gelecekte), `ARCHIVED`
yayından kaldırma için — **slug korunur.**

> **Revizyon (2026-08-18, T-024):** Özgün metin `410 Gone` diyordu. **Next 15.5'te bir
> Sunucu Bileşeni yanıt durumunu belirleyemiyor:** `next/navigation` yalnızca 404/403/401
> için kesme sağlıyor (`http-access-fallback` 410'u tanımıyor), `headers()` salt okunur ve
> durum yazan bir API yok. Frontend kaynağı okuyup doğruladı.
>
> **Karar: `ARCHIVED` → `200` + `noindex, nofollow` + açık "kaldırıldı" ekranı.**
> Değerlendirilen alternatif — Backend'in `getArchivedSlugs()` yayınlaması ve Güvenlik'in
> bunu middleware'de 410'a çevirmesi — **reddedildi:** middleware Edge'de koşuyor ve
> Prisma yüklenemiyor (T-014/K1); önbellekli bir okumayı oraya taşımak, korumakta olduğumuz
> sınırı marjinal bir SEO kazancı için delmek olurdu. `noindex` de arama motoruna dizinden
> çıkma sinyalini veriyor; 410'un farkı hız, doğruluk değil.
> Next durum kontrolü eklerse karar yeniden açılır. Sitemap ve RSS
yalnızca `PUBLISHED` **ve** `publishedAt <= now()` olanları içerir.

**C3 — `viewCount` ayrılır.** Doğrudan sütun her görüntülemede `UPDATE` demek; bu hem
write amplification yaratır hem ADR-011'in önbellek katmanıyla çelişir (her okuma bir yazma
tetiklerse önbelleğin anlamı kalmaz). Sayaç ayrı bir modele taşınır (`PostView` veya
periyodik toplama); `Post.viewCount` **türetilmiş** okunur. Uygulama F3'e (T-035) bırakılır —
v1'de sayaç olmaması kabul edilebilir, yanlış mimari kurmak değil.

**C2 — Etiketler v1'de scalar kalır.** `tags String[]` §6'daki gibi durur. Gerekçe: §4.1
yalnızca **etiket filtresi** istiyor, etiket sayfası veya etiket yönetimi istemiyor (§1.2
kapsamı dar tutuyor). Normalize `Tag` modeli yeniden adlandırma ve sayım kazandırırdı ama
v1'de karşılığı olmayan bir karmaşıklık. **Takas açıkça kabul edilmiştir:** etiket yeniden
adlandırmak toplu `update` gerektirir. Etiket sayfası (`/blog/etiket/[slug]`) istenirse
ADR yeniden açılır ve `Tag` modeline geçilir.

### Sonuçlar
- `locale` bugün hiçbir şey yapmıyor ama gelecekteki en pahalı migration'lardan birini bugünden ucuzlatıyor.
- `ARCHIVED` + `410` SEO açısından doğru davranış: arama motoruna "bu içerik kalıcı olarak kaldırıldı" der; `404` "bulunamadı, belki geri gelir" der.
- `SCHEDULED` yayın için gece cron'una bir iş daha eklenir (§13.5) veya sorgu anında `publishedAt <= now()` ile çözülür — **sorgu anında çözmek tercih edilir**, cron gerektirmez.
- `viewCount`'un F3'e ertelenmesi, F2'de public blog sayfasında görüntüleme sayısı **gösterilmeyeceği** anlamına gelir. Bilinçli.

### Alternatifler ve neden reddedildi
- **`locale`'i sonraya bırakmak** — **reddedildi**: §1.2 zaten altyapının hazır bırakılmasını istiyor ve maliyeti bugün sıfıra yakın.
- **`Tag` modelini şimdi kurmak** — Yeniden adlandırma ve sayım kazandırırdı; **reddedildi** çünkü v1'de bunları kullanacak bir ekran yok ve her yazı/proje sorgusuna bir join ekler.
- **`viewCount`'u sütun olarak tutup periyodik yazmak** — **reddedildi**: yine de her okumada bir sayaç artırımı gerekir; asıl sorun yazma değil, okuma yolunun yazma yapması.

---

## ADR-020 — Enum Sözleşmesi ve `AuditLog` Redaksiyonu

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** C9, C10, C11

### Bağlam
**C9:** `Transaction.method`, `Goal.status`, `Goal.category`, `Workout.feeling`,
`HealthLog.mood`, `Experience.type`, `Skill.category` — string mi enum mu belirsiz. §7.3
bunların Frontend'in tükettiği sözleşme olduğunu söylüyor; sonradan değişmesi migration **ve**
Frontend kırılması demek.

**C10:** `AuditLog.diff` Json alanı `ContactMessage` mutasyonunda **ham e-postayı** taşır.
§8.20 "loglarda tam e-posta ASLA görünmez" diyor — yani mevcut tasarım §8.20'yi ihlal ediyor.
Ayrıca `actorId` FK'sinin silme davranışı ve IP saklama süresi (KVKK) tanımsız.

**C11:** `ContactMessage`'da `repliedAt`, `archivedAt`, `honeypotHit`, `spamScore` yok —
"mesaj kutusu" (§4.2) bunlarsız yalnızca okundu/okunmadı olur.

### Karar

**C9 — Hepsi enum, T-010'da tanımlanır.** Serbest metin bırakılan hiçbir kategorik alan
kalmaz. `Transaction.method`: `CASH` · `BANK_TRANSFER` · `CREDIT_CARD` · `OTHER`.
`Goal.status`: `ACTIVE` · `PAUSED` · `ACHIEVED` · `ABANDONED`. `Experience.type`:
`WORK` · `EDUCATION` (§6'da zaten var). `Workout.feeling` ve `HealthLog.mood`: 1–5 **`Int`**
kalır (ölçek, kategori değil) ama Zod şemasında `min(1).max(5)` ile bağlanır.
`Skill.category` ve `Goal.category` enum olur; değerleri T-010'da Backend önerir, sözleşme
olarak raporlanır. **Enum değerleri Backend mülkiyetindedir ve raporda açıkça yayınlanır** (§7.3).

**C10 — Redaksiyon servis katmanında zorunlu.** `AuditLog` yazan tek bir yardımcı olur ve
`diff` alanı **alan adı bazlı redaksiyondan** geçer: `password`, `passwordHash`, `totpSecret`,
`totpBackupCodes`, `token`, `email` → maskelenir (`email` için yalnızca alan adı ve
`emailHash` tutulur). `actorId` `onDelete: SetNull` + `actorEmailHash` snapshot.
IP kayıtları **90 gün** sonra gece işiyle temizlenir; `AuditLog`'un kendisi korunur.
Redaksiyon yardımcısı §9 gereği birim testi yazılan fonksiyonlardan biridir ve testleri
**her maskelenecek alan adı için** ayrı assert içerir.

**C11 — İş akışı alanları eklenir.** `ContactMessage`: `repliedAt DateTime?`,
`archivedAt DateTime?`, `honeypotHit Boolean @default(false)`, `spamScore Int?`.
`honeypotHit` §8.15'in honeypot alanının sonucunu saklar — spam olarak işaretlenen mesaj
silinmez, ayrılır.

### Sonuçlar
- Frontend, enum değerlerini rapordan okuyarak kırılmadan entegre olur; §7.3'ün amacı korunur.
- §8.20 ihlali F1'de, ilk `AuditLog` yazılmadan kapanır — sonradan düzeltmek geçmiş logları temizlemeyi gerektirirdi.
- Redaksiyon tek noktada olduğu için Güvenlik ajanı denetlerken tek dosyaya bakar.
- Maliyet: enum değişikliği migration gerektirir. Bu yüzden T-010'da değerler dikkatle seçilmeli; "diğer" değeri olan enum'lara `OTHER` eklenmiştir.

### Alternatifler ve neden reddedildi
- **Kategorik alanları `String` bırakmak** — Esnek görünür; **reddedildi** çünkü yazım hatası veri kalitesini sessizce bozar ve Frontend'in hangi değerleri bekleyeceği hiçbir zaman netleşmez.
- **Redaksiyonu log yazarken değil, okurken yapmak** — **reddedildi**: hassas veri diske yazılmış olur; yedeğe (§8.21) de girer.
- **Spam mesajları silmek** — **reddedildi**: yanlış pozitif durumunda gerçek bir müşteri kaybedilir; ayırmak yeterli.

---

## ADR-021 — Spor & Hayat: PR Tekrar Bazında, `Habit` Sayaç Tabanlı

**Durum:** Kabul edildi · 2026-08-05 · **Kapsar:** C6, C7

### Bağlam
**C6:** `PersonalRecord` türetilmiş bir veri ama kaynağı yok — `workoutSetId` referansı
olmadığı için antrenman silinince veya düzeltilince PR tutarsız kalır. Daha temel sorun:
**PR tanımı yok.** 100kg×1 mi 80kg×10 mu daha iyi? §9 bu hesabın test edilmesini istiyor
ama test edilecek kural tanımlı değil.

**C7:** `Habit.targetPerWeek` haftalık, `HabitLog.done` günlük **Boolean**. Günde birden çok
kez yapılan alışkanlıklar (su içmek, kitap okumak) modellenemiyor.

### Karar

**C6 — Tekrar bazında ayrı PR (kullanıcı onayı ile).** Her tekrar sayısı için ayrı rekor
tutulur: `@@unique([exerciseId, reps])`. Yani 1RM, 3RM, 5RM, 10RM ayrı ayrı izlenir.
Tahmini 1RM formülü (Epley/Brzycki) **kullanılmaz** — karşılaştırma tahmine değil gerçek
performansa dayanır.

`PersonalRecord` kaynağına bağlanır: `workoutSetId String? @unique`, `onDelete: SetNull`.
PR **türetilmiş** veridir: bir `WorkoutSet` eklendiğinde/düzeltildiğinde/silindiğinde ilgili
`(exerciseId, reps)` için yeniden hesaplanır. Hesaplayıcı servis katmanında tek bir
fonksiyondur ve §9 gereği birim testi yazılır — testler **silme ve düzeltme** senaryolarını
da kapsar, yalnızca ekleme değil.

**C7 — `HabitLog.count Int @default(1)`.** `done Boolean` kaldırılır; "yapıldı" artık
`count > 0` demektir. `Habit.targetPerDay Int?` eklenir (günlük hedefi olanlar için,
örn. 8 bardak su); `targetPerWeek` korunur (haftada kaç gün). Hafta başlangıcı ve streak
hesabı **ADR-016'nın zaman dilimi yardımcısından** geçer — aksi hâlde gece yarısı girilen
kayıt streak'i sessizce kırar.

### Sonuçlar
- PR karşılaştırması dürüst: "80kg×10 yaptım" bir 1RM tahminine çevrilmeden kendi kategorisinde değerlendirilir.
- PR'ın türetilmiş olduğu açıkça kabul edildiği için kaynak veri düzeltildiğinde tutarsızlık kalmaz — F5'in en olası sessiz hatası kapanır.
- `count` modeli hem Boolean hem sayaç ihtiyacını karşılar; Boolean'a dönmek gerekirse `count > 0` yeterli.
- Maliyet: PR yeniden hesaplama her set mutasyonunda tetiklenir. Tek kullanıcılı sistemde ihmal edilebilir.

### Alternatifler ve neden reddedildi
- **Tahmini 1RM (Epley)** — Tek bir güç eğrisi ve güzel bir trend grafiği verirdi; **reddedildi** (kullanıcı kararı) çünkü yüksek tekrarlarda tahmin belirgin sapar ve "rekor" olması gereken şey tahmine dönüşür.
- **İkisini birden saklamak** — En zengin veri; **reddedildi** çünkü iki hesaplayıcı, iki test seti ve iki kez bozulma ihtimali demek. Gerekirse tahmini 1RM sonradan **türetilerek** gösterilebilir, saklanması gerekmiyor.
- **`PersonalRecord`'u hiç saklamayıp sorgu anında hesaplamak** — **reddedildi**: PR tarihi ("ne zaman kırdın") kayıt gerektirir, ayrıca her grafik için tüm set geçmişini taramak gerekirdi.

---

## ADR-022 — `LoginAttempt` Denemeleri, `AuditLog` Sonuçları Kaydeder

**Durum:** Kabul edildi · 2026-08-05 · **Tetikleyen:** T-013b notu T5

### Bağlam
`AuditAction` enum'unda `LOGIN`, `LOGIN_FAILED`, `LOGOUT` değerleri var (T-010) ama T-013b
giriş olaylarını `AuditLog`'a yazmadı ve haklı bir soru sordu: §8.19 "tüm panel mutasyonları
loglanır" diyor; giriş bir panel mutasyonu mu?

İki tablo arasında gerçek bir örtüşme var. Yanlış cevap iki yönde de maliyetli:
- **İkisine de yazmak** → aynı olay iki yerde tutulur; §6'nın "aynı veri iki yere girilmez"
  ilkesiyle çelişir ve iki kayıt er geç birbirini tutmaz.
- **Hiçbirine yazmamak** → `LoginAttempt` 90 günde temizleniyor (ADR-013). Hesap kilitlenmesi
  gibi güvenlik açısından kalıcı olması gereken bir olay o pencerede kaybolur.

### Karar
Sınır **olay ile durum değişikliği** arasına çizilir:

| Tablo | Ne kaydeder | Saklama |
|-------|-------------|---------|
| `LoginAttempt` | Her giriş **denemesi** — başarılı ve başarısız. Hız sınırlamanın veri kaynağı | 90 gün, sonra temizlenir |
| `AuditLog` | Denemenin yol açtığı **kalıcı durum değişikliği** | Süresiz |

`AuditLog`'a yazılacak giriş kaynaklı olaylar: **hesap kilitlenmesi** (`lockedUntil` yazıldığında),
**şifre değişikliği**, **2FA etkinleştirme/devre dışı bırakma**, **kurtarma kodlarının
yeniden üretilmesi**. Bunlar `User` kaydını değiştirdiği için zaten §8.19'un kapsamındadır.

Başarılı ve başarısız **denemeler** `AuditLog`'a yazılmaz. `LOGIN` ve `LOGIN_FAILED` enum
değerleri korunur ama v1'de kullanılmaz; kaldırmak migration gerektirir ve F6 denetimi
(T-062) aksini kararlaştırırsa yeniden eklemek gerekirdi.

Kilitlenme kaydını yazmak **T-014'ün** işidir — `lockedUntil`'i yazan taraf orasıdır (ADR-013).

### Sonuçlar
- Her olay tek yerde; iki kaydın çelişmesi mümkün değil.
- Kalıcı olması gereken güvenlik olayları 90 günlük temizlikten etkilenmiyor.
- Kural tek cümleyle ifade edilebilir: **denemeler `LoginAttempt`'e, sonuçlar `AuditLog`'a.** Sonraki ajanların hatırlaması kolay.
- `LOGIN`/`LOGIN_FAILED` kullanılmayan enum değerleri olarak kalıyor — küçük bir koku, kabul edildi.

### Alternatifler ve neden reddedildi
- **Her giriş denemesini `AuditLog`'a da yazmak** — En eksiksiz iz; **reddedildi** çünkü aynı olayı iki yerde tutar ve `AuditLog` tek kullanıcılı bir sistemde hızla giriş gürültüsüyle dolar; asıl amacı olan içerik ve muhasebe mutasyonlarını okunamaz hale getirir.
- **`LoginAttempt`'i hiç temizlememek** — Tek tablo yeterdi; **reddedildi** çünkü IP kayıtlarının süresiz tutulması KVKK açısından gereksiz veri saklamaktır (ADR-020 ile aynı gerekçe).
- **`LOGIN`/`LOGIN_FAILED` enum değerlerini kaldırmak** — Temizlik olurdu; **reddedildi** çünkü migration maliyeti var ve T-062 denetimi bu kararı gözden geçirebilir.

---

## ADR-023 — Ölçüm Görevleri Tek Başına Koşar (Paralel Derleme Yasağı)

**Durum:** Kabul edildi · 2026-08-05
**Tetikleyen:** T-017 → ENGEL-4, T-014 → T5, T-012 → BULGU-006'nın yanlış pozitif çıkması

### Bağlam
ADR-012 ile paralel çalışmayı açtım ve üç ajan aynı anda koştu. Dosya kesişimi olmadı —
ama **paylaşılan çalışma ağacı** üzerinden üç ayrı sorun çıktı:

1. **T-017:** Doğrulama sırasında sunucu üç kez "Could not find a production build" ile öldü;
   `/giris` bir ara 404 verdi. Kod hatası değil, yarış durumu — başka bir ajan aynı anda
   `pnpm build` çalıştırıp `.next`'i siliyordu. Bir Lighthouse koşusunu da düşürdü.
2. **T-014:** `pnpm build` üç temiz derlemede bir `ENOENT .next/server/pages-manifest.json`
   veriyor. CI'da (Linux, izole) hiç görülmedi.
3. **T-014 → BULGU-006:** `prisma/seed.ts`'in 22 `no-console` uyarısı üretip CI'ı düşüreceği
   bildirildi. **Doğrulandı: `pnpm lint` şu an EXIT 0.** Backend aynı sorunu kendi turunda
   K6 ile (`process.stdout.write`) zaten çözmüştü; Güvenlik ajanı **bayat bir ağaç durumunu**
   ölçmüştü. Yani paralellik yalnızca koşumları düşürmüyor, **var olmayan bulgu da ürettiriyor.**

Üçünün ortak kökü aynı: `.next/` tek ve paylaşımlı; `pnpm build`, `pnpm start`, `test:e2e`
ve Lighthouse hepsi onu yazıyor veya okuyor.

### Karar
Paralel çalışma **korunur** (ADR-012 geçerli), ancak **ölçüm görevleri tek başına koşar.**

**Ölçüm görevi (rev. 2026-08-10):** `pnpm build` veya `pnpm start` **çalıştırmayı
gerektiren** her görev. Ölçüt mekaniktir, Orkestra Şefi'nin takdirine bırakılmaz.

> **İkinci revizyon (2026-08-12, T-021/ENGEL-4 — üçüncü tekrar):** Ölçüm görevinin *kendisi*
> yalnız koşmak yetmiyor. Backend'in T-030'u paralel çalışırken bir `typecheck` koşumu yarım
> yazılmış dosya yüzünden kırıldı ve bir Lighthouse turu bayat/dev derleme ölçüp
> **perf 46–62, TBT 2.490 ms** gibi anlamsız rakamlar verdi (`unminified-javascript` uyarısı
> ele verdi). Kural genişletildi: **bir ölçüm görevi koşarken hiçbir ajan `pnpm build`
> üretmez** — kendi görevi ölçüm olmasa bile. Derleme üreten her ajan, ölçüm görevi
> dağıtılmadan önce işini bitirmiş veya commit'lemiş olmalıdır.
>
> **Neden ilk kez revize edilmişti:** T-036'yı "ölçüm görevi değil" diye işaretledim çünkü E2E veya
> Lighthouse istemiyordu. Ama tarayıcıda doğrulama gerektiriyordu, yani `pnpm start`
> çalıştırdı ve T-015 ile aynı yarışa girdi — sunucu iki kez bayat `.next` servis etti.
> Frontend haklı olarak ölçütün "build/start gerektiriyor mu" olması gerektiğini söyledi.
> **Bir görev tarayıcıda elle doğrulama istiyorsa ölçüm görevidir.**

Kurallar:
1. Orkestra Şefi aynı anda **en fazla bir** ölçüm görevi dağıtır; diğer paralel görevler
   ölçüm gerektirmeyenlerden seçilir.
2. Ölçüm görevi dağıtıldığında görev kartında **"ÖLÇÜM GÖREVİ — tek başına koşar"** ibaresi bulunur.
3. Bir ajan beklenmedik bir derleme/sunucu hatası görürse **önce paralel koşum olup
   olmadığını sorar**, sonra bulgu açar. `.next` kaynaklı `ENOENT` ve "production build
   not found" hataları varsayılan olarak yarış durumu sayılır.
4. **Bulgu açmadan önce ağacın güncelliği doğrulanır.** Başka bir ajanın alanındaki bir
   kusur raporlanacaksa, ölçüm o anki dosya içeriğiyle tekrarlanır — BULGU-006 bu adım
   atlandığı için açıldı.

### Sonuçlar
- **Olumlu:** Ölçüm sonuçları güvenilir hale gelir. Yanlış pozitif bulgular — ki en pahalı türdendir, çünkü gerçek bir ajanın gerçek zamanını harcatır — büyük ölçüde önlenir.
- **Olumsuz / kabul edilen maliyet:** Paralellik daralır. F2'de Lighthouse ve E2E görevleri sıraya girer, bu da fazın toplam süresini uzatır. Kabul edildi: yanlış ölçüm, yavaş ölçümden pahalı.
- macOS'a özgü `ENOENT` (T-014/T5) bu kuralla büyük ölçüde kaybolmalı; kaybolmazsa gerçek bir sorun olarak yeniden açılır — şimdi ayırt edilebilir hale geldi.

### Alternatifler ve neden reddedildi
- **Her ajana ayrı git worktree / ayrı `.next`** — Sorunu kökten çözerdi; **reddedildi** çünkü ajanlar aynı çalışma dizinini paylaşan ayrı oturumlar olarak kurgulandı (AJAN_PROMPTLARI.md) ve worktree yönetimi kullanıcıya günlük yük bindirirdi.
- **Paralelliği tamamen kapatmak** — En basit; **reddedildi** çünkü ADR-012'nin çözdüğü sorun (bir ajanın kendisini ilgilendirmeyen bir kararı beklemesi) geri gelirdi. Sorun paralellik değil, paylaşılan `.next`.
- **`.next` yerine ajan başına dizin (`distDir`)** — `next.config.ts` ortak dosya; her ajanın onu değiştirmesi gerekirdi ve CI ile üretim yapılandırması da ayrışırdı.

---

## ADR-024 — Kendi QR Kodlayıcımız (Dar Kapsam, Kalıcı Doğrulama Şartıyla)

**Durum:** Kabul edildi · 2026-08-10 · **Tetikleyen:** T-036/K1

### Bağlam
2FA kurulum ekranı QR kod gerektiriyor. ADR-004 yeni bağımlılığı Orkestra Şefi onayına
bağlıyor; görev kartı da "kütüphane gerekiyorsa **talep et**, kurma" diyordu. Frontend
talep etmek yerine kodlayıcıyı kendisi yazdı — gerekçesi: onay turu F1'i bir ADR boyunca
bloke ederdi ve QR bu ekranın ana gereksinimi.

Kapsam bilinçle dar tutulmuş: yalnızca bayt kipi, EC seviyesi M, sürüm 1–14
(`otpauth://` URI'leri ~90–160 bayt). Genel amaçlı bir kütüphane değil.

Doğrulama ciddi yapılmış: v1–14 kapasite tabloları referansla karşılaştırılmış (14/14),
1080 rastgele matris bit-bit kıyaslanmış, çizilen görüntü **bağımsız bir çözücüyle (jsQR)**
okutulmuş. Bu sırada **iki gerçek kodlayıcı hatası** bulunmuş; ikisi de gözle fark edilemezdi:

1. Format bilgisinin birinci kopyası satır 8 yerine sütun 8'e yazılmalıydı.
2. Reed–Solomon üreteç polinomunun katsayı sırası tersti — EC kod sözcükleri sessizce
   bozuluyordu. Çıktı "geçerli bir QR" gibi görünüyor ama hiçbir okuyucu çözemiyordu.

### Karar
Kendi kodlayıcımız **kalınır**, iki şartla:

1. **Doğrulama kalıcı hale getirilir.** 1080 matrislik karşılaştırma geçici bir sayfayla
   yapıldı ve o sayfa silindi — yani doğrulama **tekrarlanabilir değil**. Referans vektörler
   `tests/unit/` altında kalıcı bir teste dönüştürülecek. Bir doğrulama tekrarlanamıyorsa
   yarın için hiçbir şey garanti etmez.
2. **Kapsam genişlerse karar yeniden açılır.** Kodlayıcı yalnızca `otpauth://` URI'leri
   içindir. Başka bir yerde QR gerekirse (paylaşım linki, vCard, ödeme) bu ADR yeniden
   değerlendirilir ve muhtemelen `qrcode` bağımlılığına geçilir.

Gerekçe: bağımlılık eklememenin karşılığı burada gerçek. Blast radius küçük — kodlayıcı
tek ekranda kullanılıyor, girdi biçimi öngörülebilir ve **düz metin secret yedeği zaten var**
(QR okunmazsa kullanıcı anahtarı elle girebiliyor). Buna karşılık, çalışan ve doğrulanmış
kodu söküp yerine bağımlılık koymak saf değişiklik gürültüsü olurdu.

### Sonuçlar
- Bir bağımlılık eksik; §8.24 denetim yüzeyi büyümüyor.
- **Kodlayıcının bakımı bize ait.** Kabul edilen maliyet; dar kapsam bunu yönetilebilir kılıyor.
- 1. şart yerine getirilmezse bu ADR geçersizdir — doğrulanamayan kod, doğrulanmamış koddur.
- T-036'nın gösterdiği bir şey daha var: **kendi yazdığı kodu referansa karşı sınayan bir ajan, kütüphane kullansa hiç öğrenemeyeceği iki hatayı buldu.** Bu, kendi kodumuzu yazmanın yan faydası değil, doğrulamanın faydası.

### Alternatifler ve neden reddedildi
- **`qrcode` bağımlılığı eklemek** — Sıfır bakım, olgun kod; **reddedildi** çünkü çalışan ve bit düzeyinde doğrulanmış bir uygulama zaten var ve sökmek karşılığı olmayan bir değişiklik olurdu. Kapsam genişlerse yeniden değerlendirilecek.
- **Frontend'i durdurup ADR turu yapmak** — Sürece uygun olurdu; **reddedildi** çünkü F1'in tek kalan ekranı bir onay turu boyunca beklerdi ve sonuç muhtemelen aynı olurdu. Ancak bu bir **istisna**, kural değil: bağımlılık kararları normalde Orkestra Şefi'ne gelir.
- **Sunucuda QR üretip görsel olarak göndermek** — Bağımlılığı sunucuya taşırdı; **reddedildi** çünkü secret'ı bir görsel URL'sine taşımak §8.11 ve §8.20 açısından daha kötü.

---

## ADR-025 — React Bits Bağımlılıkları: `ogl` Onaylandı, `gsap` Reddedildi

**Durum:** Kabul edildi · 2026-08-11 · **Tetikleyen:** T-020/ENGEL-1

### Bağlam
React Bits bileşenlerinin 10'u projedeki `framer-motion` ile çalıştı; 6'sı yeni bağımlılık
istedi. Frontend hiçbirini kurmadı (ADR-004) ve **ölçtü** — kararın rakamla verilmesi için:

| Paket | Açtığı | gzip | Kurulmazsa kaybedilen |
|-------|--------|------|----------------------|
| `ogl` | Aurora | **12.8 KB** | Hero'nun WebGL arka planı — §5.1'in tek WebGL hakkı |
| `gsap` + `@gsap/react` | AnimatedContent/ScrollReveal, MagicBento, SplitText, ChromaGrid | **27.4 KB** | Bölüm giriş animasyonları, İletişim bento'su |

Aynı turda T-000'deki kendi uyarısını da düzeltti: "Aurora ~45–50KB, eşiği aşıyor" demişti;
44.3 KB **minify** rakamıymış, gzip'te 12.8 KB. Ayrıca §5.2.6'nın 40KB eşiğinin **gzip**
olarak okunması gerektiğini tespit etti — projenin ve Next'in tüm rakamları gzip.

### Karar

**`ogl` onaylandı (12.8 KB gzip).** Aurora, §5.1'in ana sayfaya tanıdığı **tek WebGL hakkını**
kullanıyor ve hero'nun görsel kimliği. 12.8 KB, §5.2.6'nın eşiğinin üçte biri. Üstelik
§5.2.5 gereği **mobilde ve `prefers-reduced-motion`'da hiç yüklenmiyor** — yani maliyeti
yalnızca masaüstü ve hareket tercihi açık kullanıcılar ödüyor.

**`gsap` reddedildi (27.4 KB gzip).** Açtığı dört bileşenden üçünün karşılığı zaten var:
- Bölüm girişleri → `framer-motion` `whileInView` (bağımlılıksız, ~15 satır)
- `SplitText` → `BlurText` (kuruldu)
- `ChromaGrid` → `TiltedCard` (kuruldu)

Geriye yalnızca **MagicBento** kalıyor. 27.4 KB, tek bir bölüm ızgarası için pahalı.
**İletişim bölümü `SpotlightCard` ızgarasıyla yapılır** — bileşen zaten kurulu ve §5.1
onu "hover'da mor spotlight" için tanımlıyor; bento hissi token'larla kurulabilir.

PROGRAM.md §5.1 bu kararlara göre güncellendi: `TiltedCard`, `BlurText`, `framer-motion
whileInView`, `SpotlightCard` ızgarası.

### Sonuçlar
- **Olumlu:** Tek yeni bağımlılık, 12.8 KB, koşullu yüklenen. Animasyon çalışma zamanı tek (`framer-motion`) — `motion@13` kurulsaydı ikinci bir çalışma zamanı gelirdi (T-020/K1).
- **Olumsuz / kabul edilen:** MagicBento'nun tam görsel karşılığı yok; `SpotlightCard` ızgarası daha sade duracak. §5.1'den bilinçli sapma.
- `ogl` ile birlikte Aurora'nın **en kötü kare kontrast ölçümü zorunlu hale geliyor** (§5.2.7) — arka plan hareket ettiği için ortalama değil, kare kare örnekleme. T-020b'nin kabul kriteri.
- `gsap` kararı geri dönülebilir: MagicBento'nun görsel değeri F2'de somutlaşır ve karşılığı yetersiz görülürse ADR yeniden açılır.

### Alternatifler ve neden reddedildi
- **`ogl`'i de reddedip hero'yu statik gradientle bırakmak** — En az bağımlılık; **reddedildi** çünkü §1.A public tarafın amacını "yetkinliği kanıtlamak" olarak tanımlıyor ve hero o iddianın taşıyıcısı. 12.8 KB, üstelik mobilde hiç yüklenmiyor.
- **`gsap`'i de onaylayıp §5.1'e harfiyen uymak** — Sapma olmazdı; **reddedildi** çünkü 27.4 KB'nin karşılığı tek bir bölüm ızgarası ve diğer üç kullanımın bedelsiz karşılığı var. §5.1 bir harita, dokunulmaz bir sözleşme değil — §5.2'nin sert kuralları (bundle, CLS, hareket tercihi) ondan önce gelir.
- **`motion@13` kurmak** — React Bits'in importları onu istiyordu; **reddedildi** (T-020/K1): `framer-motion`'ın yeni adı, API uyumlu, kurulsa iki çalışma zamanı olurdu.

---

## ADR-026 — F2 Public Sayfaları Gerçek Veriden Okur; İçerik Servisleri Öne Alındı

**Durum:** Kabul edildi · 2026-08-11 · **Tetikleyen:** T-021 öncesi veri kaynağı sorusu

### Bağlam
§11, F2'yi "Ana sayfa, hakkımda, projeler, blog, hizmetler, iletişim — **statik veriyle**"
diye tanımlıyor. Gerekçesi anlaşılır: görsel düzen, performans ve React Bits kurallarını
veri katmanı gürültüsü olmadan oturtmak.

Ama iki şey değişti:

1. **ADR-011 zaten aksini varsayıyor.** Dinamik render kabul edilirken karşılığında
   *"F2'den itibaren public sayfaların veri erişimi açık önbellekleme ile yazılır"*
   şart koşulmuştu. F2 statik veriyle giderse bu şart ölçülemez ve ADR-011'in koruması
   F3'e ertelenir — yani en kritik anda, gerçek veri geldiğinde, hiç sınanmamış olur.
2. **F1 beklenenden fazlasını teslim etti.** Şema, seed (21 varlık, gerçekçi içerik),
   servis konvansiyonu ve sekiz paylaşılan yardımcı hazır. İçerik servisleri (T-030)
   bu konvansiyonun mekanik uygulaması.

Statik veriyle gitmek, F2'nin her sayfasının F3'te veri erişimi için **yeniden yazılması**
demek. Aynı sayfayı iki kez yazmanın karşılığı yok.

### Karar
**F2 public sayfaları gerçek veriden okur.** İçerik servisleri (`Profile`, `Project`,
`Post`, `Experience`, `Skill`, `Service` — eski T-030) **F3'ten F2'ye alınır.**

Frontend'i bloke etmemek için **sözleşme-önce** kalıbı uygulanır — T-036'da bir kez
işe yaradı ve o görevde "eylemler geldiğinde bileşende hiçbir değişiklik gerekmedi":

1. Backend DTO şekillerini **önce yayınlar** (tip olarak, uygulama olmadan)
2. Frontend sayfaları o tiplere karşı yazar; veri geçici bir **fixture**'dan gelir,
   ama fixture **DTO ile aynı şekilde** olmak zorundadır
3. Servisler teslim edilince fixture yerini servis çağrısına bırakır — bölüm başına bir satır

**Panel CRUD ekranları F3'te kalır.** Yani F2 sonunda içerik DB'den geliyor ama henüz
yalnızca seed ile değişiyor; K2 ("panelden yönetilebilirlik") tam olarak F3'te sağlanır.
Değişen, **tesisatın doğru kurulması** — sayfa yeniden yazılmıyor.

### Sonuçlar
- **Olumlu:** Sayfalar bir kez yazılıyor. ADR-011'in önbellekleme şartı F2'de fiilen sınanıyor. `unstable_cache` + `revalidateTag` deseni F3'ün CRUD ekranları gelmeden önce oturuyor.
- **Olumsuz / kabul edilen:** F2 artık Frontend'in tek başına yürüttüğü bir faz değil — Backend de içinde. §11 tablosu buna göre güncellendi. Fixture aşaması bir senkronizasyon noktası: fixture DTO'dan **saparsa** değişim mekanik olmaz. Bu yüzden fixture'ın tipi Backend'in yayınladığı tipten türetilmek zorunda, elle yazılmış bir kopya olamaz.
- F2'nin kabul kapısına yeni madde: **public veri erişimi açık önbelleklemeyle yazılmış olmalı** (ADR-011'in karşılığı).

### Alternatifler ve neden reddedildi
- **§11'e sadık kalıp statik veriyle gitmek** — Faz sırası bozulmazdı; **reddedildi** çünkü her sayfa iki kez yazılırdı ve ADR-011'in koruması hiç sınanmadan F3'e ertelenirdi.
- **F2'yi bekletip önce T-030'u yapmak** — Sözleşme-önce gerektirmezdi; **reddedildi** çünkü Frontend bir tur boşta kalırdı ve ADR-012'nin çözdüğü sorun geri gelirdi.
- **Fixture'ları kalıcı tutup veri bağlamayı F3'e bırakmak** — En az koordinasyon; **reddedildi** çünkü aynı ikiye-yazma sorunu, yalnızca adı değişmiş olur.

---

## ADR-027 — İstatistikler Türetilir, Elle Girilmez

**Durum:** Kabul edildi · 2026-08-12 · **Tetikleyen:** T-021/ENGEL-2 (T-000'den beri açık)

### Bağlam
Ana sayfada §5.1'in `CountUp` ile gösterdiği istatistikler var ("2+ yıl", proje sayısı vb.).
`ProfileDto` böyle bir alan taşımıyor ve soru T-000'den beri cevapsız: bu sayılar nereden
gelecek? İki yol vardı — `Profile`'a `stats Json` eklemek (migration) veya mevcut veriden
türetmek.

Aynı turda Frontend, benzer bir soruyu kendi başına doğru cevaplamıştı: `Skill.level`
yüzdesi DTO'da var ama **gösterilmiyor**, çünkü *"React %87" gibi uydurma kesinlik güven
kaybettirir* (T-021/K6). İstatistikler için de aynı mantık geçerli — hatta daha güçlü:
elle girilen bir "12 proje" sayısı, gerçek proje sayısı 9'a düştüğünde **yalan olur** ve
kimse fark etmez.

### Karar
**İstatistikler mevcut veriden türetilir.** `Profile`'a `stats` alanı **eklenmez**;
şema değişmez.

| Gösterilen | Kaynak |
|------------|--------|
| Deneyim yılı | En erken `Experience.startDate`'ten bugüne |
| Proje sayısı | `PUBLISHED` ve `publishedAt <= now()` olan `Project` sayısı |
| Müşteri / iş sayısı | `Client` veya `DELIVERED` `Job` sayısı (F4'te bağlanır) |

**Kural:** *türetilemeyen bir istatistik sayfada yer almaz.* Bir sayıyı göstermek için
elle girmek gerekiyorsa, o sayı ya gerçek veriden çıkarılabilir hale getirilir ya da
gösterilmez.

Hesaplayıcı `src/server/services/_shared/` altında yaşar ve §9 gereği birim testi yazılır
(sınır durumları: hiç `Experience` yok, hiç yayınlanmış proje yok, yıl dönümü sınırı —
ADR-016'nın zaman dilimi yardımcısı kullanılır).

### Sonuçlar
- **Olumlu:** Sayılar her zaman doğru; bayatlamıyor. Şema değişmiyor, migration yok. `CountUp`'ın gösterdiği şey gerçek bir ölçüm oluyor — §1.A'nın "yetkinliği kanıtlamak" amacıyla tutarlı.
- **Olumsuz / kabul edilen:** Anlatı esnekliği yok — "50+ mutlu müşteri" gibi bir sayı, karşılığı veride yoksa yazılamaz. Bu bir kısıt değil, kararın amacı.
- Müşteri/iş istatistiği F4'e kadar bağlanamaz; o zamana kadar iki istatistik gösterilir. Eksik bir kart göstermek, uydurma bir sayı göstermekten iyidir.
- `Hakkimda` bileşeninin `istatistikler` prop'u kalkar; veri servisten gelir.

### Alternatifler ve neden reddedildi
- **`Profile.stats Json`** — Panelden serbestçe düzenlenebilirdi; **reddedildi** çünkü gerçekle bağı kopuk bir sayı üretir ve bayatladığında sessizce yanlış olur. §8.19'un denetlediği türden bir mutasyon da değil — kimse "istatistik güncellendi" logunu okumaz.
- **Sabit değerler koda gömmek** — En hızlı; **reddedildi**: §1.1 K2 ("public taraftaki her metin kod değişmeden güncellenebilir") ile doğrudan çelişir.
- **Türetilenler + elle girilen karışık** — Esneklik verirdi; **reddedildi** çünkü ziyaretçi hangisinin ölçüm hangisinin iddia olduğunu ayırt edemez; karışım her iki sayının da güvenilirliğini düşürür.

---

## ADR-028 — Dal ve Commit Disiplini: Tur Başına Tek PR, Orkestra Şefi Commit'ler

**Durum:** Kabul edildi · 2026-08-14 · **Tetikleyen:** T-030/E2, T-030b/E1, T-029b/T4 — **üç kez ısırdı**

### Bağlam
§10.5 "her görev kendi dalında" diyor. Bu kural **tek checkout paylaşan paralel ajanlarla
uygulanamıyor** ve üç kez somut zarar verdi:

1. **T-030/E2:** Backend dal açamadı, iş ağaçta kaldı.
2. **T-030b/E1:** Aynı sorun tekrar; Backend dal değiştirse T-029b'nin koşan ölçümünü bozacaktı.
3. **T-029b/T4:** Güvenlik'in dalı Frontend'in gönderilmemiş commit'i üzerine kuruldu;
   push edilince **Frontend'in işi Güvenlik'in dalına gitti**. Ajan bunu fark edip PR açmadı
   ve CI'ı `workflow_dispatch` ile tetikledi — doğru davranış, ama iş akışını tıkadı.

Ayrıca T-020'de Frontend commit'lemeyi unuttu ve iş `main` üzerinde kaldı; T-021'in commit'i
T-029a'nın dalına düştü. Kural, uygulanamadığı için sürekli ihlal ediliyor.

### Karar
**Ajanlar dal açmaz, commit atmaz, push etmez.** Görevlerini bitirir, çalışma ağacında
bırakır ve raporlar. **Orkestra Şefi commit'ler, dallar ve PR açar.**

Kurallar:
1. Bir turda dağıtılan görevler **kesişmeyen dosyalara** dokunur (§10.1 zaten bunu istiyor).
2. Tur bitince Orkestra Şefi işi **tek dalda** toplar ve **tek PR** açar. PR başlığı turu
   tanımlar, gövdesi görevleri ayırır.
3. **Orkestra Şefi PR'ın CI sonucunu görmeden bir sonraki turu dağıtmaz.** BULGU-012 iki
   gün fark edilmedi çünkü bu adım yoktu.
4. Ajanlar `pnpm build`'i yalnızca ölçüm görevindeyse çalıştırır (ADR-023); derleme
   doğrulaması Orkestra Şefi'nde.

§10.5'in "her görev kendi dalında" maddesi **"her tur kendi dalında"** olarak güncellenir.

### Sonuçlar
- **Olumlu:** Dal çakışması yapısal olarak imkânsız. Ajanlar git durumunu düşünmüyor. PR'lar tur bazında anlamlı bir bütün oluşturuyor (F1 böyle merge edildi ve okunabilir bir PR çıktı).
- **Olumsuz / kabul edilen:** Commit granülaritesi kaba — bir PR birden çok görev içerir ve `git bisect` çözünürlüğü düşer. Kabul edildi: paralel ajan akışında alternatifi çalışmayan bir kural.
- **Yeni sorumluluk:** CI sonucunu izlemek Orkestra Şefi'nin turu kapatma adımıdır, isteğe bağlı değil.
- `git worktree` değerlendirildi ve reddedildi (aşağıda); ileride ajanlar ayrı çalışma dizinlerine taşınırsa bu ADR yeniden açılır.

### Alternatifler ve neden reddedildi
- **Ajan başına `git worktree`** — Gerçek izolasyon verirdi; **reddedildi** çünkü AJAN_PROMPTLARI.md ajanları aynı dizini paylaşan ayrı oturumlar olarak kurguluyor ve worktree yönetimi kullanıcıya günlük yük bindirir. `.next/` çakışmasını da çözmez (ADR-023 ayrı sorun).
- **§10.5'i harfiyen uygulamakta ısrar** — **reddedildi**: üç kez denendi, üçünde de kural bozuldu. Uygulanamayan bir kural, disiplin değil gürültü üretir.
- **Ajanlar commit'ler ama push etmez** — Yarı yol; **reddedildi** çünkü asıl çakışma `git checkout` anında oluyor (T-030b/E1), commit'te değil.

---

## ADR-029 — `revalidateTag` Tam Dize Eşleşir; Her Seviye Ayrı Düşürülür

**Durum:** Kabul edildi · 2026-08-14 · **Tetikleyen:** T-030b, Ölçüm 2

### Bağlam
Önbellek etiketleri hiyerarşik **görünen** bir adlandırma kullanıyor:

```
content:project · content:project:tr · content:project:tr:ornek-proje
```

Backend, Next 15.5.22'nin kaynağını okuyarak eşleşmenin **tam dize** olduğunu ölçtü
(`tags-manifest.external.js:26` — `Map` araması). Yani `revalidateTag('content:project')`
`content:project:tr` taşıyan bir girdiye **dokunmaz**. Hiyerarşi bir isimlendirme kuralı;
geçersizleştirme hiyerarşik değil.

Aynı ölçüm, T-030'da bırakılmış **gerçek bir hatayı** açığa çıkardı: liste okumalarında
`tags` sarmalama anında bir kez hesaplanıyor ve `tr` sabit yazılıyordu. `getSkills('en')`
ayrı bir önbellek girdisine düşüyor ama `content:skill:tr` etiketiyle işaretleniyordu —
yani **İngilizce içerik panelden düzenlenir, kaydedilir, sitede değişmezdi** ve bir saat
sonra emniyet ağı dolunca kendiliğinden düzelirdi. *Bazen çalışan* bir bayatlama: hata
ayıklaması en zor sınıf.

### Karar
**Kural:** Bir önbellek girdisi, kendisini düşürebilecek **tüm** etiketleri taşımak
zorundadır. Etiket adlandırmasındaki hiyerarşi okunabilirlik içindir, geçersizleştirme
mekanizması değildir.

**F3'ün Server Action'ları için bağlayıcı** *(tablo T-031'de ölçümle genişletildi)*:

| İşlem | Düşen etiketler |
|-------|-----------------|
| Ekleme | `localeTag` **+ `slugTag`(yeni)** |
| Düzenleme | `localeTag`(yeni+eski) + `slugTag`(yeni+eski) |
| Durum değişikliği | `localeTag` **mutlaka** + `slugTag` |
| Arşivleme | `localeTag` + `slugTag` |
| Silme (slug'sız varlık) | `localeTag` |
| `entityTag` | **hiçbir zaman** |

**Genişletme 1 — eklemede `slugTag` de düşer (T-031) — ⚠️ GEREKÇESİ T-039'DA ÇÜRÜTÜLDÜ.**
Özgün gerekçe şuydu: `getProjectBySlug` olumsuz sonucu da önbelleğe alıyor
(`{ state: 'NOT_FOUND' }`), dolayısıyla yalnızca `localeTag` düşürmek "listede var,
tıklayınca yok" üretir.

**Bu gerekçe yanlıştı ve yanlışlığı ölçüldü (T-039, mutasyon 2).** `slugTag` üretimini
tamamen kaldıran mutasyon E2E'yi **yeşil** bıraktı. Sebep `content-cache.ts`'in kendi
kuralı: her girdi kendisini düşürebilecek **tüm** etiketleri taşır, yani detay girdisi
`entityTag + localeTag + slugTag` üçünü birden taşır. `localeTag` düşürmek detay
girdisini de düşürür. Ayrıca `tagTargetsFor` slug'ları yalnızca `locales`'e zaten
eklenmiş dillerden topluyor — yani **`slugTag`'siz bir düşürme yolu bugün kodda yok.**

`slugTag` o gün **ispatlanabilir biçimde ölüydü**: davranışı değiştirmiyordu. T-040
onu TUTMA kararı verdi — "ölü" ile "gereksiz" ayrımını yaparak: kod çalışıyor ve
girdilerin gerçekten taşıdığı bir etiketi düşürüyor, gereksizliği BAŞKA BİR DOSYADAKİ
bir tercihten (detay girdilerinin `localeTag` de taşıması) doğuyor. Aynı tur o tercihin
kendisinin bir KUSUR olduğunu ölçtü: `localeTag('project','tr')` düşürmek o dildeki
**her** projenin detay girdisini düşürüyordu, yani **A'yı düzenlemek B'nin sayfasını
geçersizleştiriyordu.**

---

### ⚠️ GÜNCELLEME — T-045: Genişletme 1'in gerekçesi ARTIK DOĞRU

**Karar:** detay girdileri (`getProjectBySlug`, `getPostBySlug`) `localeTag`
**TAŞIMIYOR**. Taşıdıkları: `entityTag + slugTag`.

**Sonuçlar — ölçüldü** (`tests/unit/services/onbellek-granulasyonu.test.ts`,
`unstable_cache`e geçirilen `tags` dizisi yakalanarak):

| Mutasyon | T-045'ten önce | T-045'ten sonra |
|---|---|---|
| A'yı düzenle → A'nın detayı | düşer | **düşer** ✓ |
| A'yı düzenle → B'nin detayı | **düşer** ✗ (aşırı) | **düşmez** ✓ |
| A'yı düzenle → `en` dilindeki detay | düşer ✗ | **düşmez** ✓ |
| A'yı düzenle → liste / istatistik / sitemap | düşer | **düşer** ✓ |

`slugTag` böylece **yük taşıyan** hâle geldi: T-039'un mutasyonu (slug üretimini
kaldırmak) artık **yakalanır** — detay girdisine ulaşan başka etiket yok. Yani
Genişletme 1'in özgün gerekçesi ("yalnızca `localeTag` düşürmek detay sayfasını bayat
bırakır") bugün **doğru**; o gün yanlış olmasının sebebi gerekçe değil, girdilerin
fazla etiket taşımasıydı.

**Erişilebilirlik korundu:** `tagTargetsFor` etkilenen kaydın slug'ını HER mutasyon
yolunda üretiyor (ekleme, düzenleme, slug değişimi eski+yeni, dil değişimi eski+yeni,
durum değişikliği, arşivleme) — testle ölçüldü.

**T-037'ye şart:** detay girdisi `fetchProjectGallery`yi de kapsıyor. Eklenti mutasyonu
geldiğinde sahibi olan kaydın `slugTag`ini **düşürmek zorunda**; eskiden `localeTag`
onu tesadüfen kapsıyordu. Bugün eklenti yazma eylemi yok, yani gerileme değil — gelecek
turun bilmesi gereken bir şart.

**İkinci ders — bir değişmezlik testi, izlediği şeyi OKUMUYORSA onu korumaz.** T-040
"slugTag gereksiz" değişmezliğini yazarken girdi etiketlerini testin içinde ELLE
modellemişti (`cached.ts`i okumuyordu). Sonuç: T-045 değişikliğinde o testler
**kırılmadı** — oysa kırılmaları bekleniyordu ve beklenmesi haklıydı. Ölçüm artık
`unstable_cache`e geçirilen gerçek diziyi yakalıyor.

**Ders (bu ADR'nin asıl kazancı):** gerekçe kodun kendisinden değil, kodun *olması
gerektiği* düşünülen hâlinden türetilmişti. Ben bu genişletmeyi Backend'in raporundan
ölçmeden ADR'ye aldım. Mutasyon testi bunu yakaladı — yeşil kalan bir mutasyon, kırmızı
olan kadar bilgi taşır.

**Genişletme 2 — `entityTag` hiçbir zaman düşürülmez (T-031).** Her girdi onu taşıdığı
için düşürmek **her zaman doğru sonucu verirdi** — tehlikeli olan da bu: Türkçe bir
düzenleme İngilizce listeyi bayatlatırdı. *Doğru olan yerine geniş olanı yapmak,
önbelleğin varlık sebebini aşındırır.*

**"Durum değişikliğinde `localeTag` mutlaka" için ayrı bir dal yazılmadı:** etiket
hesaplayıcısı her hâlükârda `localeTag` üretiyor. Koşullu yazılsaydı o koşulu unutmak
mümkün olurdu; koşulsuz olması ihlali **yapısal olarak imkânsız** kılıyor.

**`revalidatePath` kullanılmıyor (T-031 + T-032 ölçümü).** §7.1 onu anıyor ama public
okumalar etiketle önbellekli ve **panel rotalarının hepsi dinamik** (`ƒ /panel`,
`ƒ /panel/ayarlar`, `ƒ /panel/desenler` — derleme çıktısından doğrulandı). Panel sayfaları
bir gün statik önbelleğe girerse bu karar yeniden açılır.

**Yapısal koruma:** Etiketler sarmalama anında değil, **çağrı argümanlarından** hesaplanır.
`cachedRead` tek sarmalayıcıdır ve `describe` fonksiyonunu **zorunlu** kılar — sabit etiket
dizisi yazmak artık derlenmiyor. Kural yorumla değil tiple korunuyor.

### Sonuçlar
- **Olumlu:** Dil bazlı bayatlama sınıfı kapandı ve tekrarı derleme hatası veriyor. Regresyon testi **mutasyonla** doğrulandı (eski hâl geri konup testin kırıldığı görüldü).
- **Olumsuz / kabul edilen:** Server Action'lar birden çok `revalidateTag` çağırmak zorunda; unutulan bir seviye bayat içerik bırakır. Bu yüzden kural bir kod yorumunda değil ADR'de — F3'ün her CRUD görev kartına referans verilecek.
- Bugün tek dil (`tr`) olduğu için etkisi yoktu; **F3'te ikinci dil eklendiği anda** ortaya çıkardı.

### Alternatifler ve neden reddedildi
- **Tek düz etiket kullanmak** (`content:project`) — Hiyerarşi sorununu yok ederdi; **reddedildi** çünkü tek bir yazının düzenlenmesi tüm proje listesini ve istatistiği düşürürdü; önbelleğin faydası büyük ölçüde kaybolur.
- **İki sarmalayıcı** (biri sabit etiketli, biri dinamik) — Basit kullanım için kısa yol verirdi; **reddedildi**: hatanın tekrarına davetiye. Tek sarmalayıcı + zorunlu `describe`, yanlış kullanımı imkânsız kılıyor.
- **Kuralı yorumda bırakmak** — **reddedildi**: T-019b/K3'ün gösterdiği gibi, hatırlanması gereken kurallar unutulur. Tip ve ADR birlikte korur.

---

## ADR-030 — Seed, Ölçüm Sözleşmesidir

**Durum:** Kabul edildi · 2026-08-16 · **Tetikleyen:** T-029c/T1

### Bağlam
ADR-026 ile public sayfalar gerçek veriden okuyor; T-029c ile Lighthouse işi de veritabanı
kuruyor. Sonuç: **ölçülen sayfa artık seed içeriğini render ediyor.** `prisma/seed.ts`
büyürse (daha çok proje, yetenek, yazı) performans skoru **kod değişmeden** düşebilir.

Bugün mobil 92, eşik 90 — iki puan pay var. T-029 eşikleri `error`'a çevirdiğinde, seed'i
büyüten bir Backend görevi ölçüm hattını beklenmedik biçimde kırabilir.

İki yol önerildi: (i) ölçüm için sabit ve küçük bir seed profili, (ii) mevcut seed'i
ölçüm sözleşmesi saymak.

### Karar
**(ii) — seed ölçüm sözleşmesidir.** Ayrı bir "ölçüm seed'i" oluşturulmaz.

Kurallar:
1. Seed'i büyüten her görev **ölçümü yeniden alır ve raporlar.** Görev kartına kriter olarak yazılır.
2. Skor eşiğin altına düşerse bu **bozuk bir kapı değil, gerçek bilgi**: sayfa o içerik hacmiyle yavaş demektir. Çözüm eşiği gevşetmek değil, sayfayı hızlandırmak veya içerik stratejisini gözden geçirmektir.
3. Seed, üretim içeriğinin **gerçekçi bir örneği** olmayı hedefler. Yapay olarak küçük tutulmaz.

### Sonuçlar
- **Olumlu:** Ölçüm dürüst kalır. Sabit küçük bir seed rahat ama anlamsız sayılar üretirdi — gerçek site seed'den büyük olacak ve o zaman ilk kez gerçek rakamı görürdük, üstelik en geç anda.
- **Olumsuz / kabul edilen:** Bir Backend görevi ölçüm hattını kırabilir. Bu maliyet bilerek üstlenildi; kırılma **doğru bir sinyal**, gürültü değil. Görev kartlarına "seed büyüyorsa yeniden ölç" kriteri eklenerek sürpriz olması engellenir.
- T-029 eşikleri sertleştirdiğinde bu kural yürürlüktedir; iki puanlık pay dar ve bu bilinçli.

### Alternatifler ve neden reddedildi
- **Sabit küçük ölçüm seed'i** — Hattı kararlı tutardı; **reddedildi** çünkü ölçtüğümüz şey gerçek sayfa olmaktan çıkardı. "Yeşil bir paket, doğru şeyi ölçtüğünün kanıtı değil" (T-019b/K3) ilkesinin veri tarafındaki karşılığı.
- **Ölçümü tamamen statik bir sayfaya bağlamak** — En kararlı; **reddedildi** çünkü §1.1 K1 gerçek public sayfaların hızını ölçmeyi istiyor.

---

## ADR-031 — Fontlar Repoda Barındırılır (`next/font/local`)

**Durum:** Kabul edildi · 2026-08-16 · **Tetikleyen:** T-003d/T3 (öngörü) → CI koşusu `31909914487` (gerçekleşme)

### Bağlam
§3.2 fontların `next/font/google` ile yükleneceğini söylüyor. Backend T-003d/T3'te uyarmıştı:
*"İlk `pnpm build` `next/font` Google font indiricisinde düştü. Kalıcı değil… CI'da
tekrarlarsa `next/font` ağ bağımlılığı gündeme gelebilir."*

CI'da tekrarladı: `Failed to fetch Inter from Google Fonts` → `Build failed`. Yeniden
koşumda geçti (geçici ağ hatası), ama iki kez oldu.

Asıl tehlike skorun kendisi değil: **rastgele düşen bir derleme, kapının güvenilirliğini
aşındırır.** *"Zaten bazen düşüyor, tekrar koştur"* refleksi, bu projenin baştan beri
savaştığı hata sınıfının kapıya bulaşmış hâli — bir gün gerçek bir kırılma da "herhalde
yine font" diye geçilir. Ayrıca T-070'te Docker derlemesi aynı duvara çarpacak ve orada
ağ erişimi daha da kısıtlı olabilir.

### Karar
Üç font (**Space Grotesk**, **Inter**, **JetBrains Mono**) `.woff2` dosyaları olarak
repoya alınır ve `next/font/local` ile yüklenir. §3.2 buna göre güncellenir.

Korunması zorunlu olanlar:
- **`latin` + `latin-ext` subset** — Türkçe karakterler `latin-ext`te (§3.2)
- `display: swap`
- Mevcut ağırlıklar: Space Grotesk 600/700 · Inter 400/500/600 · JetBrains Mono 400/500
- T-023'ün ölçtüğü `preload` davranışı — `preload: false` denenip **geri alınmıştı**
  (FCP 907 → 1359); aynı hataya düşülmemeli

### Sonuçlar
- **Olumlu:** Derleme ağdan bağımsız — CI, Docker (T-070) ve çevrimdışı geliştirme deterministik. Çalışma zamanında `fonts.gstatic.com`'a istek gitmiyor: bir üçüncü taraf bağlantısı ve gizlilik yüzeyi eksiliyor. §8.13'ün CSP'si de sadeleşir (F6/T-060'ta bir kaynak daha az).
- **Olumsuz / kabul edilen:** Font güncellemeleri elle. Repo birkaç yüz KB büyür. Yalnızca gereken ağırlık ve subset'ler alınarak sınırlanır.
- Lisans: üç font da **SIL Open Font License** — repoda barındırmaya izin veriyor. Lisans dosyaları da alınır.
- **Ölçüm zorunlu:** FCP/LCP değişebilir. T-023'ün rakamları taban: mobil FCP 0.76 s, LCP 3.31 s, Perf 92. Geçişten sonra yeniden ölçülür; düşerse geri alınır ve gerekçe raporlanır.

### Ek: satori'ye verilen font **statik** olmalıdır (2026-08-18, T-028b/E3)

OG görselleri `@vercel/og` → `satori` üzerinden üretiliyor. Paketin içindeki `opentype.js`
**budanmış**: `name` tablosu ayrıştırması hiç yok, dolayısıyla `font.names` daima
`undefined`. `fvar` ayrıştırıcısı ise eksen adlarını `names[nameID]` ile okuyor —
**`fvar` taşıyan her font çalışma zamanında çöker** (`TypeError: Cannot read properties
of undefined`; sabit, o fontun eksen adı nameID'sidir).

Depodaki üç fontun **hepsi değişken** (ADR-031). OG için kullanılacak font önce statik
örneğe çevrilir (`fonttools varLib.instancer`), sonra alt kümelenir. `--drop-tables+=fvar`
**yetmez**: `gvar` verisi yerinde kalır ve tutarsız bir dosya üretir.

Kural `tests/unit/og-font.test.ts` ile korunuyor: geçerli TrueType imzası, zorunlu tablolar,
**`fvar`/`gvar` yokluğu** ve 12 Türkçe glifin `cmap`'te bulunması. Biri fontu güncellerken
değişken bir font gömerse derleme ve diğer testler geçse bile bu test kırılır.

### Alternatifler ve neden reddedildi
- **Yeniden koşumla idare etmek** — Bedelsiz görünüyor; **reddedildi** çünkü kapının güvenilirliğini aşındırır ve T-070'te tekrar çıkar. Bu projede "bazen düşer" kabul edilmiş hiçbir şey yok.
- **Derleme önbelleği / font önbelleği** — Sorunu azaltır, kaldırmaz; ilk derleme yine ağa bağımlı.
- **Fontları CDN'den çalışma zamanında yüklemek** — `next/font`'un çözdüğü CLS ve gizlilik sorunlarını geri getirirdi.

---

## ADR-032 — Kullanıcı Girdisi Önbellek Anahtarına Doğrulanmadan Girmez

**Durum:** Kabul edildi · 2026-08-16 · **Tetikleyen:** T-030d/K2 ve E4

### Bağlam
T-030d, filtreli liste okumalarını önbelleğe alırken beklenenden farklı bir itiraz buldu.
Görev, T-030'un K4'ündeki "girdi sayısı artar" gerekçesini yeniden değerlendirmek üzere
açılmıştı; ölçüm o gerekçenin zayıf olduğunu gösterdi (11 etiket, 5 teknoloji, en kötü
durumda ~288 girdi — kişisel bir portfolyoda önemsiz).

Ama `tag` ve `stack` **URL parametresinden** geliyor, yani **kullanıcı kontrollü**. Her
filtre değerini önbellek anahtarına vermek şu demekti:

> Ziyaretçi `?tag=<rastgele>` ile istediği kadar önbellek girdisi ürettirebilir.

Sınır 288 değil, **sınırsız**. Girdilerin çoğu bir kez okunup bir daha kullanılmaz;
dosya sistemi önbelleği şişer. T-030'un K4'ü yanlış gerekçeye dayanıyordu ama **tesadüfen
doğru tarafta duruyordu.**

Bu kalıp tek seferlik değil: F3/F4'te arama sorgusu, sayfa numarası, sıralama parametresi
aynı yerde tekrar edecek.

### Karar
**Kullanıcı girdisi önbellek anahtarına ancak sınırlı ve doğrulanmış bir kümeye
indirgenmişse girer.** Serbest metin, ham URL parametresi veya istemciden gelen herhangi
bir değer doğrudan anahtar parçası olamaz.

Uygulama sırasına göre tercih:
1. **Anahtara hiç koyma** — önbellekli geniş sonucu bellekte süz. T-030d bunu seçti:
   filtreli okuma, önbellekteki tam listeyi süzüyor. Yeni girdi üretilmiyor, üstelik
   filtreli sayfa artık DB'ye **hiç** gitmiyor.
2. **Sınırlı kümeye doğrula** — kaçınılmazsa (örn. sayfa numarası) Zod ile sınırla
   (`min`/`max`, enum) ve anahtara **doğrulanmış** değeri koy.
3. Serbest metni asla anahtara koyma.

**Sınır:** 1. seçeneğin geçerliliği veri hacmine bağlı. Tam listeyi tek istekte taşımak
pahalılaştığında yeniden değerlendirilir; T-030d bu eşiği kod yorumunda işaretledi
(liste DTO'su MDX taşımıyor, bu yüzden bugün ucuz).

### Sonuçlar
- **Olumlu:** Önbellek şişirme yüzeyi kapandı ve tekrarı için bir kural var. F3/F4'ün arama ve sayfalama görevlerinde bu soru yeniden tartışılmayacak. Yan kazanç ölçülmüştü: filtreli görünüm DB'ye gitmiyor.
- **Olumsuz / kabul edilen:** 1. seçenek, tam listeyi belleğe alma maliyeti getiriyor. Veri büyüdükçe 2. seçeneğe geçilmesi gerekebilir; eşik kodda işaretli.
- Bu bir §8 maddesi değil ama komşusu: kaynak tüketimine dayalı, kimlik doğrulaması gerektirmeyen bir kötüye kullanım yüzeyi. F6/T-062 denetiminde §8.15–16'nın (hız sınırlama) yanında değerlendirilmeli.

### Alternatifler ve neden reddedildi
- **Filtreli okumaları hiç önbelleğe almamak** (T-030'un K4'ü) — Sorunu önlerdi; **reddedildi** çünkü filtreli sayfa her istekte DB'ye giderdi ve ADR-011'in F2 için şart koştuğu korumadan çıkardı.
- **Filtre değerini anahtara koyup girdi sayısına üst sınır koymak** — Next'te yerleşik bir mekanizma yok; uygulama katmanında LRU yazmak, çözdüğünden fazla karmaşıklık getirirdi.
- **Kuralı yalnızca kod yorumunda bırakmak** — **reddedildi**: aynı soru F3/F4'te başka bir ajan tarafından sorulacak ve yorum o dosyada kalır.

---

## ADR-033 — URL Filtre Boole'ları `booleanFilterSchema` ile Ayrıştırılır; `z.coerce.boolean()` Yasak

**Tarih:** 2026-09-11 · **Durum:** Kabul edildi · **Kaynak:** T-038 (Backend ölçümü)

### Bağlam
Sekiz filtre şeması URL arama parametrelerindeki boole alanlarını `z.coerce.boolean()`
ile ayrıştırıyordu. Bu çağrı JavaScript'in `Boolean(value)` çağrısıdır ve **boş olmayan
her dize `true`'dur**.

Ölçüldü (zod 4.4.3): `"false"` → `true`, `"0"` → `true`.

Kusur tam da şemaların tasarlandığı kullanımda ortaya çıkıyordu — kendi yorumları
"değerler DAİMA string'tir" diyor. `?isRead=false` "okunmamışları getir" derken tam
tersini yapıyor ve **hiçbir hata vermiyordu**. Filtre çalışıyor görünür, yalnızca yanlış
kümeyi döndürür: bu projede tanınan en pahalı sınıf.

### Karar
`src/lib/schemas/common.ts` içindeki **`booleanFilterSchema`** tek geçerli yoldur.
Yalnızca `true` / `false` / `1` / `0` kabul eder; **tanınmayan değer hata verir** —
sessizce `true`'ya düşmek yerine gürültülü başarısızlık, ki yazım hatası fark edilsin.

`z.coerce.boolean()` filtre şemalarında **kullanılmaz**.

T-038 sekiz şemadaki on bir kullanımın **hepsini** çevirdi. Yalnızca mesaj kutusununki
düzeltilseydi geri kalan yedi filtre aynı sessiz kusuru taşımaya devam ederdi ve F4/F5
onları bozuk bulurdu: `project.featured`, `client.isArchived`/`isAjansMusterisi`,
`transaction.isPaid`, `habit.isActive`, `exercise.isArchived`,
`transaction-category.isArchived`, `recurring-transaction.isActive`.

### Sonuçlar
- **Olumlu:** Sınıfın tamamı tek turda kapandı; F4/F5 filtreleri düzelmiş bulacak.
- **Olumlu:** Gürültülü başarısızlık, `?isRad=false` gibi yazım hatalarını da yakalar.
- **Olumsuz / kabul edilen:** Tanınmayan değer artık 400 üretir. Kabul edildi: sessizce
  yanlış kümeyi döndürmekten iyidir.

### Alternatifler ve neden reddedildi
- **Yalnızca mesaj kutusunun şemasını düzeltmek** — **reddedildi**: aynı sınıf kusurun
  bir örneğini düzeltip yedisini bırakmak, kusurun bilindiği hâlde taşındığı anlamına gelir.
- **Tanınmayan değeri sessizce `false` saymak** — **reddedildi**: yön değişirdi, sessizlik
  kalırdı. Sorun yön değil, sessizlikti.

---

## ADR-034 — `redactAuditDiff` Bir Emniyet Ağıdır, Korumanın Kendisi Değil

**Tarih:** 2026-09-19 · **Durum:** Kabul edildi · **Kaynak:** T-042s (Backend), Orkestra Şefi tarafından bağımsız doğrulandı

### Bağlam
§8.20 hassas verinin denetim kaydına ve loglara yazılmamasını şart koşuyor.
`redactAuditDiff` bu koruma diye anılıyordu. T-042s kapsamını ölçtü; ben bağımsız
bir sonda ile tekrar ölçtüm. İkisi aynı sonucu verdi:

| Girdi | Sonuç |
|-------|-------|
| `password`, `newPassword`, `currentPassword`, `passwordHash` | ✅ maskelendi |
| iç içe (`after.newPassword`) ve dizi içinde | ✅ maskelendi |
| **farklı ad** — `{ yeniSifre: '…' }`, `{ pass: '…' }`, `{ secret_value: '…' }` | ❌ **sızıyor** |
| **masum anahtarın değerine gömülü** — `{ note: 'şifre: …' }` | ❌ **sızıyor** |

Ham çıktı: `{"yeniSifre":"SIZAN_DEGER_1","pass":"SIZAN_DEGER_2"}` ·
`{"note":"sifre: SIZAN_DEGER_3"}`

Redaksiyon **alan adı bazlıdır**. Bilinen bir ad listesine bakar; adı bilmediği
hiçbir şeyi koruyamaz — ve bir alanın adını seçen kişi, o adın listede olup
olmadığını düşünmek zorunda kalmaz. Koruma, hatırlamayı gerektirdiği anda koruma
olmaktan çıkar.

### Karar
**Tek güvenilir koruma sırrı diff'e hiç koymamaktır.**

Hassas veri taşıyan bir işlemde `buildDiff` **kullanılmaz**. Denetim kaydına neyin
değiştiğinin **adı** yazılır, değeri değil — T-042s'in kalıbı:
`{ context: 'CHANGE_PASSWORD', changed: 'passwordHash' }`.

`redactAuditDiff` kaldırılmıyor: bilinen adları yakalamaya devam ediyor ve ikinci
savunma hattı olarak değerli. Ama **hiçbir görev kartı, hiçbir kod yorumu ve hiçbir
ADR onu "koruma" diye anmayacak.** Adı emniyet ağı.

**Bağlayıcı kural:** Hassas veri yazan her yol, yazılan satırda sırrın bulunmadığını
**`writeAuditLog` taklit edilmeden, gerçek koduyla** ölçen bir test taşır. "Redaksiyon
var, o hâlde güvendeyiz" çıkarımı bir daha kurulamaz — T-042s ağın sınırını kaydeden
ayrı bir test de yazdı ve o test bu ADR'nin kodda duran hâli.

### Sonuçlar
- **Olumlu:** Sınıf bir kez ölçüldü ve iki bağımsız ölçümle sabitlendi.
- **Olumlu:** Kural mekanik — "buildDiff kullanma" denetlenebilir, "dikkatli ol" değil.
- **Olumsuz / kabul edilen:** Hassas yollarda denetim kaydı daha az bilgi taşır.
  Kabul edildi: §8.21 yedeklerine sızan bir sır geri alınamaz, eksik bir denetim
  satırı ise yalnızca eksiktir.

### Alternatifler ve neden reddedildi
- **Redaksiyon listesini genişletmek** (`yeniSifre`, `pass`, `secret`, …) —
  **reddedildi**: liste her zaman bir adım geride kalır ve genişletmek, ağın koruma
  olduğu yanılsamasını **güçlendirir**. Kusurun kaynağı listenin kısalığı değil,
  ada bağlı olması.
- **Değer bazlı tarama** (entropi, `$argon2id$` deseni) — **reddedildi**: yanlış
  pozitifler denetim kaydını okunamaz kılar, ve gömülü serbest metni yine kaçırır.
- **Kuralı yalnızca kod yorumunda bırakmak** — **reddedildi**: aynı varsayım bu
  projede **iki kez** kuruldu (T-038'de mesaj gövdesi, T-042s'de şifre). Üçüncüsünü
  ADR engellesin.

---

## ADR-035 — Oturum Geçersizleştirme Üç Katmanda; Kapsamlar Adlarında

**Tarih:** 2026-09-20 · **Durum:** Kabul edildi · **Kapsar:** §8.3 değişikliği, `User.writesValidFrom`
**Kaynak:** BULGU-020 (T-044g ölçümü), T-042s (Backend), T-046 (uygulama)

### Bağlam

ADR-013 JWT stratejisini seçti ve satır 545'te mekanizmayı **zaten adlandırmıştı**:
*"gerekirse token `iat` + `User.sessionsValidFrom` karşılaştırmasıyla toplu
geçersizleştirme eklenir (v1'de yok)"*.

T-042s boşluğun **gerçek** olduğunu gösterdi: şifre değiştirmek ele geçirilmiş bir
oturumu kapatmıyor, çünkü sunucuda oturum kaydı yok ve dağıtılmış JWT'ler süreleri
dolana dek geçerli kalıyor. T-044g uygulanabilirliği **ölçtü**:

| Ölçüm | Sonuç |
|-------|-------|
| Ara katmana `db` eklenip derleme | `UnhandledSchemeError`, build EXIT 1 — T-014/K1 doğrulandı |
| Depoda `await auth()` sayısı | **üç**; `(panel)` altındaki tek çağıran `ayarlar/guvenlik`. **Panel düzeni çağırmıyor** |
| Kontrolün gerektireceği asgari sorgu | p50 **0,49 ms** / p95 **0,92 ms** (200 koşu) |

Ara katman **Edge**'de koşuyor ve Prisma orada yüklenemiyor. Panel sayfaları yalnızca
ara katmanla korunduğu için, sunucu tarafında yapılabilecek her kontrol **yazmaları**
kapatır, **okumaları kapatmaz**. "Kısmi"nin tam tanımı budur.

### Karar

Üç katman, ve **her katmanın kapsamı adında**:

**(A) Oturum ömrü 7 gün → 24 saat.** Tek sabit, **sıfır sorgu**, ölçüm borcu yok.
Maruziyet penceresini %85 daraltıyor. Çerez `maxAge` ve JWT `exp` **birlikte**
değişir — biri güncellenip diğeri kalırsa tutarsız ömür çıkar.

> **§8.3 DEĞİŞİKLİĞİ:** "Oturum çerezleri: `httpOnly`, `secure`, `sameSite: lax`,
> **7 gün**" → **24 saat**. PROGRAM.md düzenlemesi Orkestra Şefi'nde.

Bedeli tek kullanıcılı panelde günde bir giriş **+ bir TOTP kodu** (§8.1 gereği 2FA
zorunlu, yani her giriş bir kod girişi demek). Kabul edildi.

**(B) `User.writesValidFrom` + yazma yolunda `iat` kontrolü.** Kolonun adı
`sessionsValidFrom` **değil** ve bu bağlayıcı: ad, yaptığı şeyi söylemeli. Oturumlar
kapanmıyor — **yazma yetkileri** kalkıyor. T-042s'te bu kolonun eklenmemesi doğruydu
(hiçbir şeyin okumadığı, ama oturumların kapatıldığını düşündüren bir kolon olurdu);
şimdi ekleniyor çünkü artık **okuyan bir kontrol var** ve adı kapsamını söylüyor.

Kontrol `currentActorId()` içinde — yani **tüm Server Action'ların geçtiği tek kapı**.
`auth()`'un jwt geri çağrısına konmadı: orası okuma yollarında da koşar ve "normal
istek yolu DB'ye gitmez" özelliğini gereksizce kaybettirirdi.

**KENDİ OTURUMU DA KAPSANIYOR ve bu bir kusur değil, özellik.** `iat` tek ayırt edici
sinyal ve şifreyi değiştiren oturumun jetonu da eskidir. Sonuç: şifreyi **saldırgan**
değiştirse bile kendi yazma yetkisini kaybeder ve yeniden giriş yapmak zorunda kalır —
ki bunun için yeni şifreye **ve** TOTP cihazına ihtiyacı vardır.

**(C) Okumaları kapatmak — F6/T-062'ye ertelendi.** Node ara katmanı gerektirir.
Güvenlik'in uyarısı kayıtta: kontrol **yalnızca `isPanelPath` için** koşmalı; `matcher`
neredeyse tüm yolları kapsadığı için aksi hâlde public sayfalara **istek başına bir
sorgu** eklenir ve **ADR-011'in tüm önbellekleme çabası geri alınır.**

### Kullanıcıya söylenebilecek cümle — BAĞLAYICI

T-042s'in yasağı **sürüyor**: "Tüm cihazlardan çıkış yapıldı" ve "Diğer oturumlar
sonlandırıldı" **yasak** — tutulamayacak sözdür.

İzin verilen ve (B) ile birlikte **doğru olan** cümle:

> **"Şifreniz değiştirildi. Güvenlik için açık olan tüm oturumlar —bu cihaz dahil—
> artık değişiklik yapamaz; değişiklik yapmak için yeniden giriş yapmanız gerekiyor.
> Oturumlar kapatılmadı, yalnızca değişiklik yetkileri kaldırıldı."**

Kısa biçim: **"Diğer cihazlar artık değişiklik yapamaz."** — doğru.
**"Diğer cihazlar çıkış yaptı."** — yanlış, yasak.

Cümlenin "bu cihaz dahil" kısmı atlanamaz: kullanıcı şifre değiştirdikten hemen sonra
bir kaydetme denerse `UNAUTHORIZED` görecek ve sebebini bilmeli.

### Sonuçlar

- Maruziyet penceresi 7 gün → 24 saat (A), ve o pencerede bile çalınmış oturum
  **yazamaz** (B).
- "Normal istek yolu DB'ye gitmez" özelliği **okuma yollarında korunuyor**; yalnızca
  Server Action başına +1 sorgu (p50 0,49 ms) eklendi.
- Okuma tarafı hâlâ açık: çalınmış bir oturum panel **içeriğini görebilir** (C, F6).
  Bu ADR onu gizlemiyor — kullanıcıya verilen cümle de bunu ima etmiyor.
- Günde bir giriş + TOTP kodu maliyeti kabul edildi.

### Alternatifler ve neden reddedildi

- **`sessionsValidFrom` adı** — **reddedildi**: T-042s'in kaçındığı yanılsamayı geri
  getirirdi. Ad, yaptığı işi söylemeli.
- **Kontrolü `auth()`'un jwt geri çağrısına koymak** — **reddedildi**: okuma yollarını
  da DB'ye bağlardı, karşılığında hiçbir okuma korumadan (okuma koruması ara katmanda
  ve orası Edge).
- **Şifre değiştiren oturumu muaf tutmak** — **reddedildi**: sunucu "bu cihaz"ı
  ayırt edemez (tek sinyal `iat`), ve muafiyet tam da saldırganın şifreyi değiştirdiği
  senaryoda onu korurdu.
- **Ara katmanı Node'a çevirip (C)'yi şimdi yapmak** — **reddedildi bu turda**:
  ölçülmüş bir bedeli var (public sayfalara istek başına sorgu) ve kendi görevini
  hak ediyor (T-062).
- **Hiçbir şey yapmayıp F6'yı beklemek** — **reddedildi**: (A) tek başına sıfır
  maliyetle pencereyi %85 daraltıyor; beklemenin gerekçesi yoktu.

---

## ADR-036 — `KAPSAM` Beyanını Rotayı Yazan Doldurur (§10.1 İstisnası)

**Tarih:** 2026-10-07 · **Durum:** Kabul edildi · **Kaynak:** Orkestra Şefi — üç turda tekrarlanan sıralama hatası

### Bağlam
T-016b'nin kurduğu rota kapsamı kapısı (`tests/unit/rota-kapsami.test.ts`) iki parçadan
oluşuyor: **kapı mantığı** (`src/app`'tan rota envanteri türetip `KAPSAM` haritasıyla
karşılaştırır) ve **`KAPSAM` haritasının içeriği** (hangi kapı dokunuyor, kanıtı ne,
ne ölçülmüyor).

`tests/**` §10.1'de Güvenlik'in. Sonuç olarak her rota ekleyen tur şöyle geçti:

1. Frontend rotayı ekler, `pnpm test` kırmızı olur
2. Frontend beyanı **raporunda tam metin olarak yazar** — kimlik zinciri ve
   "ölçülmeyen" satırları dahil
3. Ben o metni Güvenlik'in görev kartına kopyalarım
4. Güvenlik haritaya **aynen transkribe eder**

**Bu üç turda üç kez oldu** (T-034/T-043g · T-043f/T-044g · T-035+T-036b/T-048g) ve
her seferinde PR, saf bir transkripsiyon adımı için bloklandı. Paralel verdiğimde
boşluk açıldı, seri verdiğimde bir tur maliyeti çıktı. **Hatanın kaynağı ajanlar değil,
benim sıralamamdı** — ama sıralamayı düzeltmek sorunu çözmüyor, yalnızca maliyeti
hangi yere koyacağımı seçtiriyor.

Asıl gerekçe ise ajanların kendi sözlerinde duruyor ve iki ayrı ajan aynı şeyi
bağımsızca söyledi: **"beyanı — hangi kapı dokunuyor, kanıtı ne, ne ölçülmüyor —
yalnızca rotayı yazan dürüstçe doldurabilir."** Transkribe eden, beyanın doğruluğunu
sınayamaz; yalnızca kopyalar.

### Karar
**`rota-kapsami.test.ts` içindeki `KAPSAM` haritasına satır eklemek, rotayı ekleyen
ajanın görevidir.** Dosyanın geri kalanı — kapı mantığı, türetme, iddialar — **Güvenlik'in**
kalır ve ona dokunulmaz.

Yani bu, `tests/**` kuralının **tek ve adı konmuş** istisnası: bir dosyanın içindeki
bir veri yapısı.

**Bağlayıcı sonuçlar:**
- Rota ekleyen ajan, rotayı eklediği **aynı turda** beyanını da yazar. Kapı o turun
  sonunda **yeşil** olur; sonraki tura kırmızı devretmez.
- "Kapsanmıyor" **geçerli bir beyandır** — gerekçesiyle. Beyan bir test yazma
  taahhüdü değil, bir **durum bildirimi**.
- Güvenlik beyanları **denetler**: yanlış ya da fazla iyimser bir beyan bulgu konusudur.
  Yazması değil, sınaması onun işi.
- Güvenlik `KAPSAM`'a yalnızca **kendi** eklediği testler için satır ekler.

### Sonuçlar
- **Olumlu:** Transkripsiyon adımı ve onunla gelen tur maliyeti ortadan kalkıyor.
- **Olumlu:** Beyanı yazan, beyanın doğruluğunu bilen kişi oluyor — kapının
  **var olma sebebi** buydu.
- **Olumlu:** Her tur yeşil kapanıyor; ADR-028'in "CI yeşil görmeden sonraki turu
  dağıtma" kuralı artık rota ekleyen turlarda da uygulanabilir.
- **Olumsuz / kabul edilen:** İki ajan aynı dosyaya yazabiliyor. Çatışma riski düşük
  (harita bir eşleme tablosu, satırlar bağımsız) ama sıfır değil. **Kabul edildi:**
  alternatiflerin maliyeti üç turda ölçüldü.
- **Olumsuz / kabul edilen:** §10.1'in "bir ajan başkasının dosyasını değiştirmez"
  kuralı artık mutlak değil. Bu yüzden istisna **tek bir veri yapısıyla** sınırlı ve
  adı ADR'de yazılı; genişletilmesi yeni bir ADR gerektirir.

### Alternatifler ve neden reddedildi
- **Güvenlik'in görevini her zaman Frontend'den SONRAKİ tura koymak** — **reddedildi**:
  işe yarar ama her rota ekleyen tur kırmızı kapanır ve bir sonraki turun bir parçası
  transkripsiyona gider. Üç turda ölçüldü.
- **Haritayı `tests/**` dışına, ortak bir dosyaya taşımak** — **reddedildi**: kapı ile
  verisini ayırmak, verinin kapısız kalabileceği bir hâl açar; ayrıca "ortak dosya"
  statüsü her değişikliği bana getirirdi.
- **Beyanı zorunlu tutmayı bırakmak** — **reddedildi**: T-016b'nin tüm kazancı buydu
  ve kapı kurulduğundan beri **üç gerçek yakalama** yaptı.
- **Rota envanterinden beyanı otomatik üretmek** — **reddedildi**: "ne ölçülmüyor"
  türetilemez. Türetilebilen bir beyan, beyan değildir.

---

## ADR-037 — Bir İstisnanın Kendi Gerekçesi de Ölçülür

**Tarih:** 2026-10-10 · **Durum:** Kabul edildi · **Kaynak:** T-054g (Güvenlik)

### Bağlam
ADVISORY-002 (`deepmerge-ts` GHSA-ggr8-5vv4-36mx) üç aydır süreli istisnadaydı.
Gerekçesi T-005d'de şöyle yazılmıştı:

> *"`pin` TAM SABİTLİYOR, yani override açık sözleşmeyi çiğnerdi."*

Güvenlik T-054g'de bu cümleyi ayrıştırdı: **ilk yarısı ölçüm, ikinci yarısı
çıkarım.** `@prisma/config`'in `deepmerge-ts@7.1.5`'i tam sabitlediği ölçülmüştü.
Ama "o hâlde override uyumsuzluk üretir" sonucu **pin'in varlığından çıkarılmıştı
ve uyumsuzluk hiç denenmemişti.**

Denediler: override ile `deepmerge-ts@8.0.2` çözüldü, `prisma validate` /
`generate` / `migrate status` / `db execute` / `pnpm test` hepsi geçti, kilit
deltası 11 satır ve yalnızca bu zincir.

**İşlevsel yeşili yeterli saymadılar** — yükleyici `deepmerge`'i hiç çağırmıyor
olsa tablo yine yeşil görünürdü. 8.0.2'nin girişini geçici olarak `throw` yaptılar
→ `prisma validate` tam o hatayla düştü. **Yama o kod yolunda.**

İstisna silindi; üç aylık bir "bekle" kararı, gerekçesinin kendisi ölçülünce
otuz dakikada çözüldü.

### Karar
**Bir istisna, muafiyet ya da "yapılamaz" kaydı yazılırken, gerekçesinin hangi
kısmı ölçüm ve hangi kısmı çıkarım olduğu AYRIŞTIRILIR.** Çıkarım olan kısım,
istisnanın her gözden geçirilmesinde **yeniden denenebilir bir deney** olarak
yazılır.

İstisna metni şu iki soruyu ayrı ayrı cevaplamalıdır:
1. **Ne ölçtük?** (olgu)
2. **Ondan ne çıkardık, ve o çıkarımı nasıl sınarız?** (deney)

İkincisi yazılmazsa istisna, ölçülmemiş bir varsayımın üzerinde süresiz yaşar —
"süreli istisna" mekanizmasının (ADVISORY-002'de kurulan) engellemek için var
olduğu şeyin ta kendisi, bir kademe yukarıda.

**Bu ADR geriye dönük uygulanır:** açık her istisna ve "yapılamaz" kaydı, sonraki
gözden geçirmesinde bu ayrıştırmadan geçer.

### Güçlendirme — karşı kanıt maddesi (T-055g, 2026-10-11)

ADR-037 geriye dönük ilk uygulandığında kendi gerekçesinden daha güçlü bir şey
buldu: **ADVISORY-002'nin dayanağının çalışan karşı örneği kendi `package.json`'ımızda
aylardır duruyordu.**

Gerekçe şuydu: *"pin TAM SABİTLİYOR, yani override açık sözleşmeyi çiğnerdi."*
Ama aynı dosyada `mysql2` override'ı kayıtlı ve **`prisma`'nın tam pinini aşıyor**
— Orkestra Şefi doğruladı:

```
prisma 7.9.1 → mysql2 pin: 3.15.3   (TAM SABİT)
bizdeki override: >=3.23.1 <4.0.0   →  çözülen: 3.24.5
```

Dokuz minör ötesi, ve T-042g'den beri çalışıyor. **İki olgu hiç bağlanmadı ve bu
bağlanmamışlık üç aylık beklemeye mal oldu.**

**Eklenen madde:** bir katmanı, yolu ya da yaklaşımı *"yapılamaz"* diye elemeden
önce, **o yaklaşımın bu projede daha önce çalıştığı bir kayıt var mı** diye bakılır.
Karşı kanıt genellikle dışarıda değil, kendi belgelerimizdedir.

**Aynı turda ikinci bir olgu da yanlış çıktı:** ADVISORY-006 (`braces`) kaydı
*"`pnpm lint` sırasında `braces` hiç yüklenmiyor"* diyordu. Yükleniyor —
`@next/eslint-plugin-next → fast-glob → micromatch → braces`, iki bağımsız
izleyiciyle doğrulandı. Yanlış satırın kaynağı öğretici: T-042g'de **prisma
akışlarında** yapılan bir ölçüm `lint`'e **genellenmişti** — yani maruziyet
tablosunun içine saklanmış bir çıkarım.

Çıkarımın kendisi (*"maruziyet kabul edilebilir"*) doğru çıktı ama artık dolaylı
gerekçe değil **deney**: `braces`'in girişi `throw` edilince `pnpm lint` **EXIT 0**
— savunmasız kod yolu hiç koşmuyor, çünkü `get-root-dirs` yalnızca
`settings.next.rootDir` verilmişse `globSync` çağırıyor. **Deneyin geçerlilik
koşulu kayda geçti:** `rootDir` eklenirse sonuç tersine döner.

**Ders:** bir maruziyet tablosunun satırları da ölçüm ile çıkarım olarak
ayrışır. "Yüklenmiyor" bir ölçümdür ve hangi komutla ölçüldüğü yazılmalıdır;
başka bir komuttan genellenmişse o bir çıkarımdır.

### Sonuçlar
- **Olumlu:** Üç aylık bir istisna kapandı ve `deepmerge-ts` artık yamalı.
- **Olumlu:** Kural mekanik — istisna metninde iki başlık aranır, "dikkatli ol" değil.
- **Olumlu:** İşlevsel yeşilin yetmediği de kalıba girdi: **yamanın gerçekten o kod
  yolunda olduğu**, girişi bozup hatanın geldiğini görerek sınanır.
- **Olumsuz / kabul edilen:** İstisna yazmak pahalılaşıyor. Kabul edildi: T-054g
  üç aylık bir beklemeyi otuz dakikada çözdü, oran lehimize.

### Alternatifler ve neden reddedildi
- **Yalnızca ADVISORY-002'yi kapatıp dersi yazmamak** — **reddedildi**: aynı hata
  biçimi bu projede tanıdık. Kusur `deepmerge-ts`'e özgü değil, **gerekçe yazma
  biçimine** özgü.
- **Her istisnayı her turda yeniden ölçmek** — **reddedildi**: maliyeti gerçek ve
  istisnaların çoğu gerçekten bekliyor. Gözden geçirme anı yeterli.
- **"Süreli istisna" mekanizmasını kaldırmak** — **reddedildi**: mekanizma çalıştı,
  iki kez ateşlendi. Sorun mekanizmada değil, içine yazılan gerekçedeydi.

---

## ADR-038 — Mutasyon Anlık Görüntüyle Geri Alınır; Commit Rapor Başına Atılır

**Tarih:** 2026-10-12 · **Durum:** Kabul edildi · **Kaynak:** T-103 olayı
**Değiştirir:** ADR-028'i **tamamlar** (geçersiz kılmaz)

### Bağlam
ADR-028 dal disiplinini çözdü: ajanlar dal açmaz, commit atmaz, push etmez;
Orkestra Şefi yapar. Üç turda üç kez yaşanan dal çakışmasını kapattı ve **çalıştı.**

Ama bir şeyi korumasız bıraktı ve T-103'te bedeli ödendi: **commit'siz iş, paylaşılan
bir çalışma ağacında bir tur boyunca savunmasız duruyor.**

Olay: bir ajan `baseAmount` mutasyonunu geri alırken
`git checkout -- src/server/services/job.ts` kullandı. Dosya **takipli** ve **başka
bir ajan tarafından değiştirilmiş** olduğu için `checkout` dosyayı o ajanın
düzenlemesi öncesine değil **HEAD'e** döndürdü — yani paralel ajanın commit'siz
işini sildi. Dört kalem kayboldu; `md5` sapmayı **tespit etti ama geri alamadı.**

Ajanın kendi tespiti kuralın özü:

> *"`git checkout` bir geri-alma aracı değil — paylaşılan bir çalışma ağacında başka
> ajanın commit'siz işini de alır. Doğrulama aracını onarım aracı sandım."*

Kurtarma denendi ve **yok**: Vite önbelleği, `.next`, editör yerel geçmişi —
hiçbirinde kopya yoktu.

### Karar

**1. Mutasyon, anlık görüntüyle geri alınır. `git checkout --` YASAK.**

Ölçüm için takipli bir dosyayı geçici olarak bozan ajan, **bozmadan önce** dosyanın
içeriğini scratchpad'e kopyalar ve geri alırken **oradan** yazar. `git`'in geri-alma
komutları (`checkout --`, `restore`, `stash`) takipli dosyalarda **kullanılmaz**:
hepsi HEAD'i referans alır ve HEAD, paralel ajanın işini içermez.

`md5` doğrulaması **kalır** — ama ne olduğu artık yazılı: bir **tespit** aracıdır,
onarım aracı değildir.

**1b. Anlık görüntünün adı YOLU taşır, `basename` yetmez (T-106).**

Backend kuralı uygularken kuralın kendisinde bir boşluk buldu: iki takipli dosyayı
yedekledi, ikisinin `basename`'i aynıydı (`src/lib/schemas/job.ts` ve
`src/server/services/job.ts`), ve **ikinci kopya birincisini ezdi.** Yedek sessizce
tek dosyaya düşmüştü.

Yani ADR-038'in birinci kuralı, kendi koruduğu kayıp sınıfını `basename`
çakışmasıyla **yeniden üretebiliyordu** — ve bu projede `job.ts`, `transaction.ts`,
`project.ts`, `client.ts` adları `schemas/`, `services/` ve `actions/` altında
**üç kez** tekrarlanıyor, yani çakışma istisna değil kural.

Anlık görüntü adı **tam yolu** kodlar (ör. `src--server--services--job.ts` ya da
dizin yapısını koruyan bir kopya). Backend ayrı adlarla yeniden aldı ve `md5`
eşleşmesini ölçtü.

**Ders, kuralın kendisinden daha genel:** bir koruma mekanizması, koruduğu hata
sınıfını kendi içinde yeniden üretebilir. ADR-038 yazıldığında bu ölçülmedi;
ilk uygulamada ortaya çıktı.

**2. Orkestra Şefi commit'i RAPOR BAŞINA atar, tur başına değil.**

Asıl kök neden buydu. Üç ajanın işi tek bir commit'i beklerken ağaçta birikti; ilk
rapor geldiğinde commit atılmış olsaydı, ikinci ajanın `checkout`'u **HEAD'e** dönerdi
ve HEAD **birinci ajanın işini içeriyor** olurdu — kayıp olmazdı.

ADR-028'in "bir tur, bir PR" kuralı **korunuyor**: commit ≠ PR. Rapor başına commit
atılır, PR tur sonunda açılır. Kırık bir ara commit kabul edilebilir ve **açıkça
`wip(` ile işaretlenir** — kırık bir commit, kaybolmuş bir turdan iyidir.

**3. Kayıp envanteri ÖLÇÜLÜR, rapordan alınmaz.**

Bu olayda rapor üç kalem saydı ve dördüncüsünü *"kayıp değil, HEAD'de duruyor"*
diye geçti. `git show HEAD:<dosya>` ile ölçüldü: **yanlıştı** — o kalem de kayıptı.
Üçünü geri yazıp dördüncüyü atlamak ağacı kırık bırakırdı.

Hasar bildiren bir rapor, hasarın kapsamını **en az güvenilir** olduğu andır: ajan
kendi hatasını raporluyor ve tam o anda ölçmekten çok hatırlamaya yakındır.
**Orkestra Şefi envanteri `git` ile bağımsız doğrular.**

### Sonuçlar
- **Olumlu:** Kayıp penceresi bir turdan bir rapora iniyor.
- **Olumlu:** Kural mekanik — "`git checkout --` kullanma" denetlenebilir,
  "dikkatli ol" değil.
- **Olumlu:** `md5`'in ne olduğu yazılı hâle geldi: tespit, onarım değil.
- **Olumsuz / kabul edilen:** Ara commit'ler kırık olabiliyor ve geçmiş gürültülü
  görünüyor. Kabul edildi: PR squash edildiği için `main`'in geçmişi temiz kalıyor.
- **Olumsuz / kabul edilen:** Orkestra Şefi'nin iş yükü artıyor (tur başına üç commit).
  Kabul edildi; bu turda kaybedilen iş o maliyetin kat kat üstünde.

### Alternatifler ve neden reddedildi
- **Her ajana kendi `git worktree`'si** — kayıp sınıfını tamamen kapatırdı;
  **reddedildi**: ajanlar tek bir checkout paylaşıyor ve bunu değiştirmek projenin
  çalışma düzenini baştan kurmayı gerektirir. Yeniden değerlendirilebilir, ama bu
  olayın gerektirdiği müdahale bu değil.
- **Ajanlara commit yetkisi vermek** — ADR-028'in üç turda ölçülerek çözdüğü dal
  çakışmasını geri getirirdi. **Reddedildi.**
- **Mutasyon testini yasaklamak** — **reddedildi**: mutasyon bu projenin en değerli
  aracı ve defalarca sahte yeşil yakaladı. Araç değil, geri alma yöntemi kusurluydu.
- **Kuralı yalnızca görev kartlarına yazmak** — **reddedildi**: üç ajanın hepsini ve
  gelecekteki her turu bağlıyor; kartta kalırsa bir kart onu yazmayı unutur.

---

## ADR-039 — Kategori Türü ile İşlem Türü Eşleşmek Zorunda Değil; Uyuşmazlık Gizlenmez

**Tarih:** 2026-10-12 · **Durum:** Kabul edildi
**Kaynak:** T-104 (Frontend sordu), T-102 (Backend ölçtü), Orkestra Şefi kararı

### Bağlam
Frontend sordu: *"Kategori türü işlem türüyle eşleşmek zorunda değil. Şema bunu
dayatmıyor — gelir işlemine gider kategorisi bağlanabilir ve sunucu kabul eder.
Arayüz engellemiyor (şemanın söylemediği bir kuralı dayatmamak için). Bunun
bilinçli olduğu ölçülmedi."*

Soru yerinde ve cevabı T-102'nin ölçümünde duruyor. Backend canlı ölçtü:

```
Kategori "Proje Geliri" GELİR iken 1.000 TL gelir işlemi girildi
Kullanıcı kategoriyi GİDER'e çevirdi  (T-101 buna izin veriyor)

DOĞRU  → islemTuru=INCOME  katTuru=EXPENSE  UYUŞMAZ=true
NAİF   → 1.000 TL GELİR, GİDER kefesine yazılırdı
```

### Karar
**Eşleşme zorunlu tutulmaz.** Üç gerekçe, üçü de ölçüme dayanıyor:

**1. Uyuşmazlık meşru bir durumdan doğuyor.** Kategorinin türü **sonradan
değiştirilebiliyor** ve altındaki işlemler **kendi türünü koruyor.** Yazma anında
eşleşme zorlanırsa iki kötü seçenekten biri çıkar: kategori türünü değiştirmek
**engellenir** (oysa yeniden sınıflandırma meşru bir ihtiyaç), ya da değiştirmek
geçmiş satırları **sessizce geçersiz kılar.**

**2. Defterin gerçeği işlemin kendi türüdür.** Kategori bir **etikettir**; bir
gelir hareketi, etiketi değiştiği için gider olmaz. Bu yüzden kategori dağılımı
`Transaction.type` üzerinden hesaplanıyor (T-102) — kategorinin türü üzerinden
hesaplamak *"toplamlar yine tutar, yalnızca yanlış kümede"* sınıfından sessiz bir
hata üretirdi.

**3. Arayüz, şemanın söylemediği bir kuralı dayatmaz.** Frontend'in refleksi
doğruydu. Arayüzde sert bir engel, sunucunun kabul ettiği bir kaydı imkânsız
gösterir ve iki katman birbirini tutmaz.

**Ama gizlenmez de.** Üç yerde görünür olmak **bağlayıcı**:

- **Rapor:** `typeMismatch` alanı o satırı işaretliyor (T-102). *Arayüz durumu
  açıklamak zorunda, saklamamalı* — kullanıcı *"neden gider kategorisinde gelir
  var"* diye sorabilmeli.
- **Seçici:** kategori seçeneklerinde **türü yazılı** (T-104 böyle yaptı), yani
  kullanıcı uyuşmaz bir seçim yaptığını **görerek** yapıyor.
- **Oluşturma anı:** bir **yumuşak uyarı** savunulabilir ve **sert engel değildir** —
  çünkü oluşturma anındaki uyuşmazlık muhtemelen kullanıcı hatası, meşru vaka ise
  **sonradan yeniden sınıflandırmadan** doğuyor. Bu ayrımı yapan bir uyarı
  yazılabilir; **zorunlu tutulmuyor** ve yazılırsa gönderimi **engellemeyecek.**

### Sonuçlar
- **Olumlu:** Yeniden sınıflandırma meşru kalıyor ve geçmiş veri bozulmuyor.
- **Olumlu:** Rapor doğru kümeyi sayıyor ve uyuşmazlık **görünür** — sessiz değil.
- **Olumlu:** Şema ile arayüz aynı şeyi söylüyor; ikisi birbirini tutmuyor hâli yok.
- **Olumsuz / kabul edilen:** Kullanıcı oluşturma anında yanlış kategori seçebilir
  ve kayıt kabul edilir. Kabul edildi: düzeltilebilir bir hata, ve alternatifi
  (yeniden sınıflandırmayı engellemek ya da geçmişi geçersiz kılmak) geri alınamaz.

### Alternatifler ve neden reddedildi
- **Şemada `CHECK` kısıtı** — **reddedildi**: kategori türünü değiştirmeyi kalıcı
  olarak engeller, çünkü mevcut satırlar kısıtı ihlal eder. Yeniden sınıflandırma
  meşru bir ihtiyaç ve bu onu öldürür.
- **Yazma anında serviste reddetmek** — **reddedildi**: aynı sonuç, bir katman
  yukarıda; ve kategori türü değiştiğinde geçmiş satırlar **zaten** uyuşmaz hâle
  geleceği için kural baştan tutarsız olur.
- **Arayüzde seçenekleri işlem türüne göre süzmek** — **reddedildi**: sunucunun
  kabul ettiği bir kaydı imkânsız gösterir, ve arşivli kategoriye bağlı eski bir
  işlemi düzenlerken T-103/T-104'te çözülen *"bağ koparma"* kusurunun aynısını
  üretir.
- **Uyuşmazlığı hiç yüzeye çıkarmamak** — **reddedildi**: `typeMismatch` olmadan
  kullanıcı rakama bakıp hatayı **veride** arar. T-102'nin ölçümü tam bunu gösterdi.


---

## ADR-040 — `RecurringTransaction`: Tetikleyici Elle, Cron Sonra

**Tarih:** 2026-10-14 · **Durum:** Kabul edildi · **Kaynak:** Orkestra Şefi kararı
**İlgili:** ADR-015 (`periodKey` idempotanslığı), ADR-030

### Bağlam
Altyapının tamamı hazır ve ölçülü: şema (`frequency`, `nextRunAt`, `isActive`),
`createGeneratedTransactionSchema`, `buildPeriodKey`/`periodKeyForInstant`, ve
idempotanslığın gerçek güvencesi `@@unique([sourceRecurringId, periodKey])`.

**Eksik olan yalnızca servis ve tetikleyici.** Backend bunu F4 boyunca **üç kez**
kapsam dışı bıraktı ve her seferinde aynı gerekçeyle:

> *"`createGeneratedTransaction` servisi yazmak **çağıranı olmayan kod** olurdu —
> T-040'ın en pahalı sınıfı, T-053'te `fetchAuditLogById` yazmama gerekçemin aynısı."*

**Gerekçe doğru** ve bu projede üç kez ödenmiş bir ders. Ama sonucu bir çıkmaz:
cron F7'de kurulacağı için servis F7'ye kadar yazılamaz; yazılmazsa şema F5 ve F6
boyunca **ölü ağırlık** olarak durur.

**Çıkmazı çözen gözlem:** itiraz *"servis yazmak"* değil **"çağıranı olmayan servis
yazmak"**tı. Yani sorun servisin kendisi değil, **çağıranın cron olmak zorunda
sanılması.**

### Karar
**Tetikleyici elle, panelden. Cron F7 de aynı eylemi çağırır.**

- `/panel/muhasebe` üzerinde bir eylem: *"Tekrarlayan kalemleri işle"* —
  `nextRunAt` geçmiş ve `isActive` olan kalemleri işler.
- Servisin **gerçek bir çağıranı** var, yani ölü kod değil; itiraz karşılandı.
- Özellik **bugün kullanılabilir**: kullanıcı ayın başında düğmeye basar.
- F7 de cron (`T-073` ile aynı dağıtım turu) **aynı eylemi** çağırır — yeni kod
  değil, yeni bir tetikleyici.

**İdempotanslık zorunlu ve zaten kurulu:** `@@unique([sourceRecurringId, periodKey])`.
Düğmeye iki kez basmak ikinci bir kayıt üretmez. **Elle tetiklemeyi güvenli kılan
şey bu** — cron bir kereliktir, elle tetiklemede kullanıcı iki kez basabilir.

**Yıl sınırı bağlayıcı (T-108g ölçümü):** `buildPeriodKey` dört basamaklı yıl
varsayıyor; yıl 10000 un `YEARLY` anahtarı yıl 1000 ile **çakışıyor** ve
idempotanslık o anahtara dayandığı için **bir dönemin kaydı başkasının üzerine
upsert edilir.**

### Sonuçlar
- **Olumlu:** Şema ölü ağırlık olmaktan çıkıyor, özellik v1 de **çalışıyor.**
- **Olumlu:** Backend in "çağıranı olmayan kod" ilkesi **esnetilmedi** — karşılandı.
- **Olumlu:** F7 de yapılacak iş yalnızca bir zamanlanmış görev tanımı; mantık
  ölçülmüş ve kullanımda olacak.
- **Olumsuz / kabul edilen:** Kullanıcı düğmeye basmayı unutursa kalem düşmez.
  Kabul edildi: geçici hâl, ve **sessiz değil** — gecikmiş kalem sayısı ekranda
  görünür olmalı (*"3 kalem işlenmeyi bekliyor"*).
- **Olumsuz / kabul edilen:** `nextRunAt` ilerletme mantığı elle tetiklemede de
  doğru olmalı; cron un "her gün bir kez" varsayımı yok.

### Alternatifler ve neden reddedildi
- **F4 e cron ekle** — **reddedildi**: cron un çalışacağı yer sunucu ve o F7 de
  kuruluyor; şimdi yazmak çalıştırılamayan bir zamanlayıcı bırakırdı.
- **F7 ye tamamen taşı** — **reddedildi**: şema F5 ve F6 boyunca ölü ağırlık kalır,
  ve F7 de hem mantık hem tetikleyici aynı turda yazılır — yani mantık **ilk kez
  dağıtım turunda** ölçülür. Bu projenin en kaçındığı sıralama.
- **v1 kapsamı dışı ilan et** — **reddedildi**: şema, Zod şemaları, `periodKey`
  üreticisi ve tekillik kısıtı **zaten yazılı ve test edilmiş.** Kapsam dışı ilan
  etmek, ölçülmüş çalışan altyapıyı erişilemez bırakmak olurdu — F4 kabul
  kontrolünün bulduğu *"kod var, yol yok"* sınıfının bilinçli hâli.
- **Yalnızca servis yaz, çağıranı F7 de bağla** — **reddedildi**: Backend in
  itirazının tam hedefi bu ve itiraz haklı.


---

## ADR-041 — Q1: Panel `/panel` Altında Kalır (Alt Alan Adı Yok)

**Tarih:** 2026-10-14 · **Durum:** Kabul edildi · **Kaynak:** Orkestra Şefi ölçümü
**Kapatır:** Q1 (F0 den beri açık) · **İlgili:** ADR-013, §8.3, §8.12–14

### Bağlam
Q1 F0 da açılmıştı: panel ayrı bir alt alan adında mı (`panel.ornek.com`) yoksa
`/panel` altında mı? Alt alan adı lehine standart argüman **köken yalıtımı**:
public sitedeki bir XSS panele erişemez.

### Ölçüm
İki şey ölçüldü ve ikisi de argümanı çürütüyor.

**1. Çerez host kapsamlı — `domain` niteliği YOK.**

```
src/server/auth.ts:69
  name: useSecureCookies ? '__Secure-authjs.session-token' : 'authjs.session-token'
  (domain niteliği verilmiyor)
```

Paneli alt alan adına taşımak iki seçenek bırakır ve ikisi de **kötü**:

- `domain: '.ornek.com'` eklemek → çerez **her alt alan adına** açılır. Bu bir
  güvenlik **kaybı**: bugün tek bir hosta bağlı olan oturum, yarın eklenecek
  herhangi bir alt alan adından okunabilir hâle gelir.
- Alt alan adı için **ayrı bir auth akışı** → iki kimlik sistemi, iki kat yüzey,
  ve ADR-013 ün tek JWT stratejisinin terk edilmesi.

**2. Tek bir Next uygulaması — yalıtım iddiası bu mimaride YOK.**

Public site ve panel **aynı süreçte, aynı kod tabanında, aynı ara katmanla**
çalışıyor. Alt alan adı yalnızca bir yönlendirme etiketi olurdu; XSS yüzeyi
`src/app` ın tamamı ve o paylaşılıyor. Yalıtım ancak **ayrı dağıtımlar** ile
gerçek olurdu ve bu, projenin dağıtım modelini (tek Coolify uygulaması, §13)
baştan kurmak demek.

### Karar
**Panel `/panel` altında kalır.** Hâlihazırda çalışan hâl **doğru olan hâl**.

- **Maliyet sıfır:** ek DNS kaydı yok, ikinci sertifika yok, ikinci uygulama yok.
- **Güvenlik kaybı yok** — aksine, çerezi host kapsamlı tutmak alt alan adına
  taşımaktan **daha dar**.
- Korumanın gerçek yeri zaten ara katman + her Server Action ın kendi `auth()`
  kontrolü (§8.6, ADR-035/B), ve o **alan adından bağımsız**.
- `/panel` altındaki her rota `noindex, nofollow, nocache` taşıyor; arama
  motorlarından gizlenme alt alan adı gerektirmiyor.

### Sonuçlar
- **Olumlu:** F7 bir alan adı, bir sertifika, bir uygulama ile ilerliyor.
- **Olumlu:** `NEXT_PUBLIC_SITE_URL` tek bir değer; panel için ikinci bir taban
  adresi yönetilmiyor.
- **Olumsuz / kabul edilen:** Public site ile panel aynı kökeni paylaşıyor. Kabul
  edildi, çünkü **alt alan adı bu mimaride onu değiştirmiyor** — yalnızca
  değiştiriyormuş gibi görünüyor, ki bu daha kötü.
- Gerçek yalıtım ileride istenirse gereken şey alt alan adı değil **ayrı dağıtım**;
  o gün bu ADR yeniden açılır.

### Alternatifler ve neden reddedildi
- **`panel.ornek.com`, çerez `.ornek.com` kapsamlı** — **reddedildi**: güvenlik
  kaybı, kazanç değil.
- **`panel.ornek.com`, ayrı auth akışı** — **reddedildi**: iki kimlik sistemi,
  ADR-013 ün terk edilmesi, ve ölçülmüş bir ihtiyaç yok.
- **Ayrı dağıtım (gerçek yalıtım)** — **reddedildi (şimdilik)**: §13 ün tek
  uygulama modelini ve F7 nin tamamını baştan kurmayı gerektirir. Tek kullanıcılı
  bir panel için bu maliyet karşılıksız.

---

## ADR-042 — Q2: v1 de Mail Sağlayıcı YOK

**Tarih:** 2026-10-14 · **Durum:** Kabul edildi · **Kaynak:** Orkestra Şefi ölçümü
**Kapatır:** Q2 (F0 den beri açık) · **İlgili:** §2, T-038, T-041f, T-042s

### Bağlam
Q2: Resend mi SMTP mi? PROGRAM.md §2 mail i tek bir amaçla anıyor:

> | Mail | Resend veya SMTP (sunucu) | **İletişim formu bildirimi** |

### Ölçüm
**1. Hiç mail kodu yok.** `src/` altında `resend`, `nodemailer`, `sendMail`, `smtp`
geçen **tek bir dosya yok**. `.env.example` da yalnızca boş bir `RESEND_API_KEY`
duruyor — F0 da ihtiyatla açılmış bir yer tutucu.

**2. Bildirimin amacı ZATEN karşılanıyor.** T-038 ve T-041f mesaj kutusunu kurdu;
dashboard `unreadCount` basıyor (ölçüldü) ve rozet **filtreden bağımsız**. Yani
kullanıcı panele girdiği anda okunmamış mesajı **görüyor.**

**3. Şifre sıfırlama mail e bağlı değil.** T-042s onu *"Q2 karara bağlanmadı, F7"*
diye bırakmıştı — ama sistem **tek kullanıcılı** ve `totpBackupCodes` şemada
duruyor (T-013a: 10 kurtarma kodu, argon2id ile hash li). Kurtarma yolu **zaten
var** ve mail gerektirmiyor.

### Karar
**v1 de mail sağlayıcı kurulmaz.** PROGRAM.md §2 nin mail satırı *"v1 kapsamı
dışı"* olarak işaretlenir; `RESEND_API_KEY` `.env.example` dan **kaldırılmaz**
ama yanına gerekçe yazılır (boş bir anahtar, sonraki okuyucuya *"kurmayı unuttuk"*
der).

**Şifre sıfırlama v1 de yok ve kurtarma yolu kurtarma kodlarıdır.** Bu, kullanıcıya
açıkça söylenir — `/giris` ekranında *"şifremi unuttum"* bağlantısı **konmaz**
(T-018 in ölü düğme yasağı), yerine kurtarma kodlarının nerede olduğu yazılır.

### Sonuçlar
- **Olumlu:** Üçüncü taraf bağımlılığı yok, DNS kaydı (SPF/DKIM/DMARC) yok,
  rotasyon gereken anahtar yok, teslim edilebilirlik riski yok.
- **Olumlu:** F7 den bir kalem düşüyor ve §8 in saldırı yüzeyi **daralıyor** —
  mail, dışarıya veri taşıyan bir kanaldır ve §8.20 kapsamına girerdi.
- **Olumlu:** Maliyet gerçekten sıfır; Resend in ücretsiz katmanı da yeterdi ama
  **kurmamak ondan da ucuz.**
- **Olumsuz / kabul edilen:** Kullanıcı yeni mesajı ancak panele girdiğinde görür.
  Kabul edildi: kişisel bir sitede günlük mesaj hacmi düşük, rozet ilk bakışta
  görünür, ve alternatifi bir dış servise bağımlılık.
- **Olumsuz / kabul edilen:** Kurtarma kodları kaybolursa erişim kaybolur. Kabul
  edildi — ama bu mail ile de böyle olurdu (mail hesabı da kaybolabilir) ve
  kurtarma kodları **offline** tutulabildiği için daha dayanıklı.

### Yeniden açılma koşulu
Mail, **ölçülmüş bir ihtiyaç** belirdiğinde eklenir: kullanıcı mesajları kaçırdığını
söylerse, ya da ikinci bir kullanıcı eklenirse (o zaman şifre sıfırlama gerçek bir
ihtiyaç olur). İkisi de bugün yok.

### Alternatifler ve neden reddedildi
- **Resend (ücretsiz katman)** — **reddedildi**: 3.000 e-posta/ay bedava ama
  **ihtiyaç ölçülmemiş.** Domain doğrulaması için DNS kaydı, rotasyon gereken bir
  anahtar ve bir dış arıza noktası getiriyor. Karşılığında bugün panelin zaten
  verdiği bilgiyi veriyor.
- **SMTP (barındırma hesabından)** — **reddedildi**: beş yapılandırma değeri,
  paylaşılan hostun itibarına bağlı teslim edilebilirlik, ve aynı ölçülmemiş ihtiyaç.
- **İkisini de kurup seçimi F7 ye bırakmak** — **reddedildi**: iki yarım entegrasyon,
  §5.2 nin paket bütçesine ve §8 in yüzeyine iki kez ödeme.


---


### Ek — 2026-10-21: iletişim bildirimi isteğe bağlı açıldı

Kullanıcı "tüm eksikleri gider" dedi ve mesajın e-postaya düşmesini istedi. Karar
tersine çevrilmedi, **genişletildi**: `notification.ts`'teki adaptör sözleşmesi tam
bunun için kurulmuştu ve çağıran uç değişmedi.

- `RESEND_API_KEY` **ve** `CONTACT_NOTIFY_EMAIL` doluysa Resend, yoksa `noop` — bugünkü
  davranış. Biri eksikken yarım kurulum sessizce hiçbir yere gitmesin diye ikisi birden şart.
- Paket yok, tek `fetch` (ADR-004). Gövde **düz metin** (HTML enjeksiyonu yüzeyi yok),
  konu tek satıra indirgeniyor (CR/LF temizliği mutasyonla sınandı), `reply_to` ziyaretçi.
- 5 sn zaman aşımı; hata akışı durdurmuyor (adaptörün baştan beri kuralı). Log'a adres
  ya da sağlayıcı gövdesi girmiyor (§8.20).
- Şifre sıfırlama vb. diğer mail ihtiyaçları hâlâ kapsam dışı.

## ADR-043 — Yüklenen SVG Kabul Edilmez

**Tarih:** 2026-10-16 · **Durum:** Kabul edildi · **Kaynak:** T-037 (Backend sordu), Orkestra Şefi kararı
**İlgili:** §8.11, ADR-018, ADR-031

### Bağlam
Backend `ALLOWED_MIME_TYPES` icinde `image/svg+xml`'in diger tiplerden **iki
yonden** ayrildigini olctu ve kararı bana birakti:

**1. Icerikten guvenilir dogrulanamiyor.** PNG/JPEG/WebP/PDF'in sihirli baytlari
var — ilk 12 bayt tipi kesin soyler. SVG ise **metin**: onunde XML yorumu,
`<?xml`, `DOCTYPE` olabilir. Tespit zorunlu olarak **sezgisel**.

Ve bu sezgisel bu projede **zaten bir kez kirildi**: `src/app/icon.svg` bir XML
yorumuyla basliyor ve `<svg` etiketi **514. baytta** — Backend'in ilk 512 baytlik
penceresinin iki bayt otesinde. Yani projenin **kendi dosyasi** naif kontrolu
gecemiyordu.

**2. Betik calistirabilen tek tip.** Imzali adresle dogrudan acildiginda tarayici
SVG icindeki `<script>`i **calistirir**. Koken R2 alan adi oldugu icin oturum
cerezimize erisemez — ama kimlik avi yuzeyi gercek: panelden yuklenen bir dosya,
bizim alan adimizdan gelmis gibi gorunen bir adreste calisir.

### Karar
**`image/svg+xml` kabul edilen tiplerden cikarilir.**

Uc gerekcenin ucu de olculdu:

**(a) Guvenilir dogrulanamayan bir tipi kabul etmek, dogrulayicinin varlik
sebebiyle celisir.** §8.11 "uzanti degil icerik" diyor; SVG'de icerik kontrolu
bir **tahmin**, ve tahmin yapan bir kapi kapi degildir. Projenin kendi dosyasinin
pencereyi kirmasi bunun somut kaniti — pencereyi 4096'ya cikarmak o vakayi
cozer, **sinifi cozmez**.

**(b) Ihtiyac olculmedi.** SVG'nin gercek kullanim yeri logo ve ikon. Projede
ikonlar `lucide-react`'ten geliyor, site simgesi **repoda** (`src/app/icon.svg`),
ve `LogoLoop` musteri logolari **zaten acik degil** — Frontend T-109h'te olctu:
*"eksik olan gorsel yukleme degil, logo verisinin kendisi; musteri kaydiyla logo
iliskisi modellenmemis."* Yani SVG yukleme bugun **hicbir ekranin ihtiyaci degil**.

**(c) Alternatifi daha pahali.** `Content-Disposition: attachment` eklemek
betigi etkisizlestirirdi ama R2 nesne metadata'si gerektirir, her imzali adreste
tasinmasi gerekir, ve **unutuldugu yerde sessizce acik birakir** — tam olarak bu
projenin "bir sey yapiyormus gibi duran koruma" dedigi sinif.

**Kapsam disi birakilan sey yukleme, kullanim degil.** Repoda duran SVG'ler
(`icon.svg`, bilesen ici inline SVG, `LogoLoop`'un ileride alacagi varliklar)
etkilenmiyor — onlar **bizim yazdigimiz** dosyalar, ziyaretci ya da panel
girdisi degil. Ayrim yazilidir: **guven siniri "kim yazdi", "hangi tip" degil.**

### Sonuclar
- **Olumlu:** Dogrulayici artik yalnizca **kesin** olarak tanidigi tipleri kabul
  ediyor; sezgisel dal tamamen kalkiyor.
- **Olumlu:** Betik calistirabilen tek tip yuzeyden cikiyor; kimlik avi senaryosu
  kapaniyor.
- **Olumlu:** `file-type.ts`'teki `SVG_SCAN_BYTES` ve metin tarama mantigi
  silinebilir — **daha az kod, daha az tahmin**.
- **Olumsuz / kabul edilen:** Ileride vektorel bir logo yuklemek gerekirse PNG/WebP
  kullanilacak. Kabul edildi: olculmus bir ihtiyac yok, ve ihtiyac belirdiginde
  bu ADR yeniden acilir.

### Yeniden acilma kosulu
`LogoLoop` icin musteri logosu modeli yazilir **ve** vektorel kalite olculmus bir
ihtiyac olursa. O gun gereken sey SVG'yi listeye geri koymak degil, **sanitize
edilmis** bir SVG yolu (betik/olay niteliklerini soyen bir ayristirici) ya da
`Content-Disposition` zorunlulugu — ikisi de kendi kartini hak eder.

### Alternatifler ve neden reddedildi
- **Pencereyi 4096 bayta cikarip devam** — **reddedildi**: vakayi cozer, **sinifi
  cozmez**. Bir sonraki dosya 5000. baytta baslar.
- **`Content-Disposition: attachment`** — **reddedildi**: R2 metadata'si gerektirir,
  her imzali adreste tasinmasi gerekir, ve unutuldugunda **sessizce** acik birakir.
- **SVG'yi sanitize etmek** — **reddedildi (simdilik)**: dogru cozum ama olculmus
  bir ihtiyac yokken yazilan bir ayristirici, bakim yuku olan olu koddur.
- **Olani birakmak** — **reddedildi**: Backend riski olcup raporladi; olculmus bir
  riski "bugune kadar sorun olmadi" diye birakmak bu projenin kayit tuttugu her
  dersin tersi.

---

## ADR-044 — Dosyalar Aynı Kökenden Yüklenir ve Sunulur; Tarayıcı R2'ye Hiç Gitmez

**Durum:** Kabul edildi · 2026-10-20 · **Kapsar:** T-037f · **Tersine çevirir:** T-037'nin tarayıcıdan doğrudan PUT akışı

### Bağlam

T-037 iki adımlı bir akış kurdu: sunucu imzalı PUT adresi verir, **tarayıcı doğrudan R2'ye** yükler, sunucu nesneyi geri okuyup onaylar. Gerekçe ölçülmüştü ve doğruydu: Server Action gövdesi varsayılan 1 MB, §8.11 ise 10 MB istiyor.

T-037f'te arayüzü yazmadan önce **tarayıcının gerçekten yapacağı isteği** ölçtüm. İmzalı adrese `Origin` ve `Access-Control-Request-Method: PUT` ile ön uçuş:

```
preflight 403   access-control-allow-origin = null
```

Bucket'ta CORS tanımlı değil. T-037 akışı `curl` ile ölçülmüştü ve `curl` CORS'a tabi değil — yani **akış hiçbir tarayıcıdan çalışmazdı**. Çalıştırmak iki dış koşul istiyor: bucket CORS'una üretim kökenini yazmak (alan adı F7'de belli olacak; Cloudflare tarafında elle yapılandırma) ve CSP'nin `connect-src`ine R2 kökenini eklemek (T-060'ın kapattığı yüzeyi genişletmek).

Sunum tarafı da açıktı: ADR-018 imzalı adresi "istek anında" istiyor ama public sayfalar önbellekli (ADR-011). T-037 çatışmayı "imzalı adres önbellekli DTO'ya girmesin" diye çözdü; görselin sayfaya **nasıl** gireceğini yazmadı. İmzalı adres HTML'e girseydi `img-src`e R2 kökeni gerekecekti ve 15 dakikada bayatlayan adresler önbellekli sayfalarla yine çatışacaktı.

### Karar

**Tarayıcı R2'ye hiç gitmez. Yükleme ve sunum aynı kökendeki iki uçtan geçer.**

1. **Yükleme** — `POST /api/v1/panel/eklenti` (route handler, `multipart/form-data`). Route handler'lar Server Action'ın 1 MB sınırına TABİ DEĞİL; T-037'nin gerekçesi bu uç için geçerli değil. Sunucu baytları alır, **SAKLAMADAN ÖNCE** doğrular (boyut, sihirli bayt, ADR-043), anahtarı üretir, R2'ye sunucudan yazar, satırı oluşturur. Kimlik: ara katman (§8.5, `/api/v1/panel/*`) + uçta `currentActorId` (§8.6, ADR-035/B) + §8.16 hız sınırı.
2. **Sunum** — `GET /api/v1/dosya/[id]`. Sunucu nesneyi R2'den okuyup verir.
   - Proje, yazı, profil eklentileri **herkese açık**: `Cache-Control: public, max-age=31536000, immutable`. İçerik değişmez — yeni dosya yeni kimlik demek — yani önbellek asla bayatlamaz.
   - Makbuz, iş, müşteri eklentileri **yalnızca oturumla**: `private, no-store`. Oturumsuz istek 404 alır (var olduğunu da söylemez).

### Sonuçlar

- CORS yapılandırması **gerekmiyor**; CSP **genişlemiyor** (`img-src`/`connect-src` `'self'` kalıyor).
- Doğrulama yazmadan önce yapıldığı için T-037'nin **yetim nesne penceresi ve onay adımı ortadan kalkıyor**: geçersiz bayt R2'ye hiç yazılmıyor. DB yazımı düşerse nesne yine hemen siliniyor (telafi korunuyor).
- ADR-018'in önbellek çatışması kapanıyor: HTML'de imzalı adres yok, yalnızca kalıcı `/api/v1/dosya/<id>`.
- R2 yine **private**: imzasız erişim yok; sunucu kendi imzasıyla okuyor (§8.11 karşılanıyor).
- **Bedel:** baytlar sunucudan geçiyor — yüklemede en fazla 10 MB, sunumda public dosyalar tarayıcıda kalıcı önbelleğe alınıyor. Tek kullanıcılı bir panel ve kişisel bir sitede ölçülemeyecek kadar küçük; trafik büyürse bu uca bir CDN konur, karar değişmez.
- `requestUploadAction`/`confirmUploadAction` **kaldırılıyor**: tarayıcıdan çalışmayan ve arayüzü olmayan bir POST ucu, imzalı PUT adresi dağıtan gereksiz bir yüzeydi. Doğrulama mantığı servise taşındı, testleri onunla gitti.

### Alternatifler ve neden reddedildi

- **Bucket'a CORS tanımlamak (T-037'yi çalıştırmak)** — reddedildi: üretim kökeni henüz yok, Cloudflare'de elle yapılandırma ister (sürüm kontrolünün dışında) ve CSP'yi genişletir. Kazancı (baytların sunucudan geçmemesi) bu ölçekte ölçülemiyor.
- **İmzalı adresi sayfaya basmak** — reddedildi: önbellekli sayfada 15 dakikada bayatlar (ADR-018'in öngördüğü çatışma) ve `img-src`e R2 kökeni ister.
- **R2'yi public bucket yapmak** — reddedildi: §8.11 ile doğrudan çelişir; makbuzlar herkese açılırdı.


---

## ADR-045 — Public Sitenin Görsel Dili Yenilendi: Koyu Sahne, Dev Başlıklar, Kayan Paneller

**Durum:** Yerini ADR-047 aldı (2026-10-27) · kabul 2026-10-21 · **Kapsar:** public site (`src/app/(public)`, `src/components/public`) · **Değiştirir:** §3.1 (public'te tema seçimi), §3.2 (display fontu), §5.1 (bileşen haritası) — panel ETKİLENMEZ

### Bağlam

Kullanıcı mevcut ön yüzü beğenmedi ve bir referans verdi (Pinterest, newform.community videosu): tamamen koyu zemin; ekranı kaplayan, geniş ve çok kalın büyük harf başlıklar; kaydırdıkça içi dolan kontur başlıklar; koyu sahnenin üstüne kayan açık renkli paneller; üst üste yığılan proje kartları; kayan logo/görsel şeritleri ve renkli geometrik şekillerle biten bir alt bilgi. İstek: "neredeyse aynısı, ama benim profilime uygun, yazılım mühendisi dokunuşuyla".

Kullanıcının üç kararı (2026-10-21): hero'nun ortasındaki **3B avatarı kendisi verecek** (o zamana kadar süs); public site **yalnızca koyu**; örnekteki müşteri yorumlarının yerine **yetenek kartları** (veritabanında yorum yok, uydurma yorum yazılmaz).

### Karar

1. **Public site her zaman koyu.** `(public)/layout.tsx` kabı `.site-koyu`; globals.css'te bu sınıf koyu token'ları yeniden basar. Tema çerezi ve düğmesi **panelde** yaşamaya devam ediyor. Açık paneller (Hizmetler, İletişim, CTA kutuları) `.panel-acik` ile T-002b'de **ölçülmüş** aydınlık token'ları kapsamlı basar — yeni renk değeri icat edilmedi, içerideki form ve rozetler kendiliğinden aydınlığa geçer.
2. **Display fontu: Archivo, geniş (wdth 125), 800–900.** OFL, repoda (`fonts/archivo-genis.woff2`, 38 kB, `uret.py` ile — ADR-031 kalıbı). Yalnızca public layout'ta tanımlı, panel onu ön yüklemez. Gövde Inter, mono JetBrains Mono — değişmedi.
3. **Vurgu gradyanı `--gradient-vurgu` (#d1127f → #7756ff).** Beyaz metin her durakta ≥ 4.6:1 (ölçüldü). Dekoratif şekil renkleri `--sekil-*` yalnızca `aria-hidden` süslerde.
4. **Hareket: önce CSS, gerektiğinde framer-motion.** Harf harf giriş, kayan şeritler, süzülme ve sayfa geçişi **saf CSS** (sunucuda çizilir, hidrasyonu beklemez; hero LCP adayı). Kaydırmaya bağlı olanlar (kontur başlığın dolması, panelin büyüyerek oturması, paralaks) framer-motion `useScroll` — zaten bağımlılıktı, yeni paket yok. Proje yığını `position: sticky` ile, JS'siz.
5. **Aurora (WebGL) public'ten kalktı.** Referansta yok; sayfa başına WebGL hakkı (§5.2.2) kullanılmıyor.
6. **Yazılımcı imzası:** terminal istemi gibi sayfa yolları (`kullanici@site:~/projeler $`), proje kartlarında `const proje = {…}` künye bloğu, `--etiket` süzgeç etiketleri, `cd ../projeler` geri bağlantısı, canlı yerel saat, parlak `{ }` / `</>` süsleri.

### Korunanlar (pazarlık dışı)

- **Erişilebilirlik:** dev başlıkların görsel harfleri `aria-hidden`, `<h1>` adını `sr-only` metinden alır; kontur başlıkta okunan katman DOLU olandır; kayan şeritlerin kopyası `aria-hidden` + `inert`; sayfa başına tek `<h1>`.
- **`prefers-reduced-motion`:** CSS animasyonları globals.css'teki blokla tek kareye iner; framer bileşenleri `useReducedMotion` ile kaydırma etkisini hiç uygulamaz.
- **LCP:** giriş animasyonu opaklığı 0'dan değil 0.01'den başlatır (Chrome opaklığı 0 olan öğeyi LCP adayı saymıyor).
- **E2E sözleşmeleri:** `data-cta`/`data-hizmet`/`data-kaynak`/`data-proje` öznitelikleri, iletişim formu alan kimlikleri, `/projeler/…` ve `/blog/…` bağlantıları.

### 3B avatar

`public/avatar-3d.webp` (ya da `.png`) konduğu an hero'da görünür; yoksa parlak küre + `</>` süsü. Dosya modül yüklenirken bir kez aranır — yeni dosya yeni dağıtımla gelir. Önerilen: şeffaf zeminli, kare, ≥ 832 px.

---

## ADR-046 — Site Üç Dilde: Türkçe (Öneksiz), İngilizce ve Almanca (Önekli, Yerelleştirilmiş Adresler)

**Durum:** Kabul edildi · 2026-10-22 · **Kapsar:** public site, panel içerik ekranları, sitemap, OG · **Değiştirir:** PROGRAM.md §1.2 "v1 sadece TR" (altyapı zaten hazırdı — `locale` alanları, `@@unique([slug, locale])`)

### Bağlam

Kullanıcı İngilizce ve Almanca seçeneği istedi: "doğru ve profesyonel olsun". Hedef okuyucu yurt dışındaki işverenler ve iş ortakları; çeviri makine kokmamalı, adresler o dilde okunmalı, arama motoru dilleri doğru eşlemeli.

### Karar

1. **Türkçe öneksiz kalır** (`/projeler`), diğerleri önekli ve **yerelleştirilmiş**: `/en/projects`, `/en/about`, `/en/services`, `/en/contact`, `/en/cv`; `/de/projekte`, `/de/ueber-mich`, `/de/leistungen`, `/de/kontakt`, `/de/lebenslauf`. Mevcut Türkçe adresler ve dizin bozulmaz. Adres tablosu TEK: `src/i18n/rotalar.ts` (`PARCA`, `yol()`, `cozumle()`).
2. **Kanonik tek adres:** `/tr/...` → öneksiz, `/en/projeler` → `/en/projects` (308). Middleware önekli adresi içeride `/[dil]/<türkçe-parça>`ya **yeniden yazar**; dili `x-dil` başlığıyla kök düzene (`<html lang>`) ve 404 sayfalarına taşır.
3. **Sayfalar tek yerde:** `src/components/sayfalar/*.tsx` `dil` alır; Türkçe rotalar ve `app/(public)/[dil]/…` yalnızca ince sarmalayıcı. `[dil]` bilinmeyen öneki 404'ler.
4. **Arayüz metni sözlükte** (`src/i18n/sozluk/{tr,en,de}.ts`), şekli `Sozluk` tipiyle zorunlu. İstemci bileşenlerine sözlüğün tamamı değil, yalnızca ihtiyaç duyduğu dilim prop olarak iner (işlev istemciye geçemediği için form metinleri `{eposta}`/`{n}` yer tutucusu taşır). Hata sayfası küçük `hata-metni.ts`'i kullanır.
5. **İçerik dil başına satır.** Profil dil başına tek satır (Türkçenin kimliği `singleton` kalır, diğerleri cuid). Proje ve yazıda `translationKey` (`@@unique([translationKey, locale])`): çeviriler Türkçe slug'ı anahtar taşır, kendi dilinde **kendi slug'ı** olur.
6. **Dil seçici:** liste sayfalarında doğrudan karşılık (`yol()`); detayda `/api/v1/dil` çeviri anahtarıyla karşılığı bulur, yoksa hedef dilin listesine düşer (404 değil). Açık yönlendirme yok — hedef `yol()` ile yeniden kurulur.
7. **SEO:** her sayfa `alternates.languages` (üç dil + `x-default` = Türkçe) ve kanonik taşır; karşılığı olmayan dil listeye girmez. Sitemap her dili hreflang kümesiyle bildirir. OG görseli `?dil=` alır (yalnızca bilinen dil).
8. **Üslup:** İngilizce en-US, doğrudan ve birinci tekil. Almanca resmî **„Sie"**, aralıklı uzun tire „ – ", „…" tırnak, Duden ay kısaltmaları. Kalite kapısı `tests/unit/i18n-sozluk.test.ts`: boş metin, sızan yer tutucu, en/de'de Türkçe harf (özel adlar hariç), Türkçesiyle aynı kalmış metin ve Almancada „du" yasak.
9. **Panel:** içerik ekranlarında dil sekmeleri; yeni kayıt sekmenin dilinde açılır, formlarda çeviri anahtarı alanı.

### Bilinçli olarak yapılmayanlar

- **Tarayıcı diline göre otomatik yönlendirme yok.** Arama motoru botlarını ve paylaşılan bağlantıları yanlış dile atar; seçim ziyaretçinin.
- **RSS yalnızca Türkçe** — besleme okuyucusu kitlesi küçük; ihtiyaç doğarsa `/en/rss.xml`.
- **Lighthouse yalnızca Türkçe ana sayfada** — bileşen ağacı aynı, metin farklı. Almanca uzun başlıkların mobilde taşması görsel kontrol, kapı değil.

### Sonuç

İçerik `scripts/icerik/*.{en,de}.ts` dosyalarında, `scripts/icerik-yukle.ts` üç dili sırayla yazar. Çeviriler kaynakta olmayan hiçbir iddia eklemez; sayı, sıralama ve adlar birebir korunur.

---

## ADR-047 — Public Site Kurumsal Tasarıma Geçti: Açık Zemin, Tek Vurgu, Süssüz Bölümler

**Durum:** Kabul edildi · 2026-10-27 · **Kapsar:** public site (`(public)` route grubu, `components/public`, `components/sayfalar`) · **Değiştirir:** ADR-045'in görsel dili (koyu sahne, dev kontur başlıklar, kayan şeritler, yüzen şekiller, yapışkan proje yığını)

### Bağlam

Sahibi ADR-045 dilini "çok şablon gibi, yapmacık" buldu ve "daha kurumsal, profesyonel" bir tarz istedi; zemin seçimi soruldu, **açık zemin** seçildi. Ayrıca bir gün önceki inceleme aynı dilin hedef okuyucu (işe alımcı, iş ortağı) için hareketi fazla bulduğunu ve yığın kartların 16 projede ekranı doldurduğunu ölçmüştü.

### Karar

1. **Tema:** `.site-kurumsal` kabı açık token'lar basar (beyaz zemin, `#0f172a` metin, tek vurgu `#1d4ed8`). Gradyan yok: `--gradient-accent` düz vurguya eşit. Panel kendi temasını korur (`:root` koyu, `.light`).
2. **Tipografi:** sitede bütün başlıklar Inter 600 (dosya 400–600 üretildi, 700 sahte kalın olurdu). Archivo (geniş, 900) ve dosyası kaldırıldı. `tabular` sitede rakam hizasını korur ama mono değildir; mono yalnızca kod.
3. **Bileşenler:** `Bolum` (bölüm kabı + başlık + sağda tek eylem, zemin beyaz/gri sırayla), `SayfaBasligi` (terminal istemi ve harf animasyonu yok), `dugmeler.tsx` (birincil düz / ikincil çerçeveli; büyük harf ve kayan ok yok), `ProjeKartlari` (iki sütun ızgara; yığın kaldırıldı).
4. **Kaldırılanlar:** `KonturBaslik`, `SahnePaneli`, `HarfHarf`, `Yuzen` + şekiller, `KayanSerit`, teknoloji şeridi, kaydırmaya bağlı animasyonlar (`kontur-dol`, `panel-otur`, `paralaks`), terminal tarzı metinler (`cd ../projeler`, `--etiket`, sahte yığın izi).
5. **Ana sayfa sırası:** hero → hakkımda → projeler → başarılar → yetenekler → iletişim (işe alımcının sorusuna göre).

### Bilinçli olarak korunanlar

- `BolumGiris` (ekrana girerken kısa, opak olmayan kayma) ve sayfa girişi animasyonu — ölçülü, `prefers-reduced-motion`a tabi.
- `dev-baslik` yardımcısının ADI (çağıran yerler boyutu kendisi veriyor); içi artık olağan başlık.

### Ek (2026-10-28) — ölçülü hareket

Sahibi "hiç animasyon yok, biraz dinamik olsun" dedi. Eklenenler: hero öğelerinin 60–300 ms arayla belirmesi (LCP `<h1>` yalnızca kayar, opaklık yok); bölüm başlıkları ve kartların ekrana girerken kademeli belirmesi (`BolumGiris`); kart, düğme ve çiplerde üzerine gelme geçişleri; menü alt çizgisinin soldan dolması; istatistiklerin ekrana girince sayması (`sayac.tsx`, framer-motion yok, sunucu son değeri basar); "Şu an" noktasının nabzı; kaydırmaya bağlı okuma ilerleme çubuğu (saf CSS). Hepsi `prefers-reduced-motion`a tabi.

---

## ADR-048 — Panel Kişisel ve Telefon Öncelikli: İş/Müşteri/Muhasebe Kaldırıldı

**Durum:** Kabul edildi · 2026-10-29 · **Kapsar:** panel (`src/app/(panel)`, `components/panel`, servisler, şema) · **Değiştirir:** ADR-017 (iş/müşteri), ADR-014/015/040'ın muhasebe uygulamaları, T-117 (müşteri logosu)

### Bağlam

Sahibi iş yönetimini ayrı bir sistemden yürütüyor; bu panelin kişisel olmasını ve "genelde telefondan" kullanılacağı için uygulama gibi olmasını istedi. Planlanan bölümler: Cüzdan (muhasebenin yerine), Sağlık (tartı görüntüsü + Claude API yorumu), Spor (program + antrenman oturumu), Hayat (alışkanlık + dönemsel hedefler).

### Karar

1. **Kaldırıldı:** İşler, Müşteriler, Muhasebe (işlem, kategori, tekrarlayan, rapor, CSV dışa aktarma), mesajı işe dönüştürme, müşteri logosu şeridi. Göç `20261029120000_is_modullerini_kaldir` beş tabloyu ve dört enum'u düşürür — üretimde tablolar BOŞTU (sayıldı).
2. **Korundu:** `money.ts` (Cüzdan), ay/yıl/hafta tarih yardımcıları (Hayat hedefleri) — `servis-ulasilabilirlik` kapısında "bekleyen" olarak bildirildi.
3. **Telefon kabuğu:** alt sekme çubuğu (Bugün · Hayat · Spor · Sağlık · Daha), "Daha" mevcut çekmeceyi açar; masaüstünde yan menü. `viewportFit: cover` + güvenli alan payları; "Ana Ekrana Ekle" için `/panel.webmanifest` (adı `/panel` ile başlamaz — middleware oturuma bağlardı) ve `appleWebApp`. Dokunmatik ekranda form alanları ≥16 px (iOS yakınlaştırması).
4. **Ana ekran "Bugün":** alışkanlık ilerlemesi, son tartı, son antrenman, okunmamış mesaj.

### ADR-048 eki (2026-10-30) — Spor: program ve canlı oturum

- **Şema:** `ProgramDay` (ad, odak, haftanın günü, sıra) + `ProgramExercise` (set, tekrar metni, dinlenme sn); `Workout` ← `programDayId`, `startedAt`, `finishedAt`, `kcal`; `Exercise.tip` (form ipucu). Göç yalnızca EKLEME.
- **Program:** sahibinin PDF'teki 5 günlük kol ağırlıklı programı + cumartesi yüzme/koşu tek dokunuşla yüklenir (`ONERILEN_PROGRAM`); hareketler ADA göre bulunur ya da açılır.
- **Oturum:** tek açık oturum (başlat → açık varsa ona gider). Setler mevcut `createWorkoutSetAction` ile yazılır — kişisel rekor hesabı tek yerde kalır. Dinlenme sayacı yalnızca istemcide (kaybolması zararsız).
- **Kalori:** `MET × son tartı kilosu × saat` (ağırlık 5,0 · kardiyo 8,0). Tartı yoksa 80 kg ve ekranda söylenir; Decimal kilo metin üzerinden sayıya çevrilir (ADR-014/D). Tahmin — nabız verisi yok.
- **Telefon:** kırıntı yolu dar ekranda gizli (kayıt kimliği okunmuyordu).

### Ek (2026-10-30) — Cüzdan (muhasebenin yerine)

- **Şema:** `WalletAccount` (banka/nakit/yatırım; birim TRY, döviz ya da altın/gümüş türü), `WalletDebt` (toplam, GÜNCEL kalan, aylık taksit, ödeme günü, bitiş) + `WalletDebtPayment`, `WalletFlow` (gelir/gider: kimden/kime, sıklık, gün ya da tarih), `PriceQuote` (son bilinen kur). Tutarlar `Decimal(12,2)`, her yerde metin (ADR-014/D).
- **Kur:** Truncgil (`finans.truncgil.com/v4/today.json`) — anahtarsız, döviz VE altın türleri tek yanıtta (TCMB altın vermiyor). 10 dk bellek; kaynak 5 sn'de yanıt vermezse `PriceQuote`taki son bilinen kur "bayat" uyarısıyla. Kuru olmayan kalem toplama GİRMEZ ve ekranda sayılır — sıfır ya da uydurma kur yok.
- **Değerleme:** varlık ALIŞ (bozdurunca eline geçen), borç SATIŞ (kapatmak için ödeyeceğin) — ihtiyatlı net.
- **Bu ay:** gelir − gider − borç taksitleri; haftalık ×52/12, yıllık ÷12, tek seferlik aylığa girmez.
- **Ödeme:** kalanı düşürür, sıfırın altına indirmez, sıfırda borcu kapatır (tek işlem).
- **Denetim:** her mutasyon `AuditLog`a yazılır ama yalnızca değişen ALAN ADLARI — tutar kişisel finans verisi (sağlık kaydıyla aynı karar).
- **Sekmeler:** Bugün · Cüzdan · Hayat · Spor · Sağlık; geri kalanı üst çubuktaki "Daha".

### Ek (2026-10-30) — Sağlık: akıllı tartı + yapay zekâ yorumu

- **Şema:** `HealthLog`a tartı alanları (BMI, vücut suyu %, kas kg, kemik kg, protein %, iç yağ, deri altı yağ %, iskelet kası %, bazal metabolizma, metabolik yaş). Göç yalnızca boş olabilen sütun EKLER.
- **Tartı ekranı:** görüntü tarayıcıda ≤1568 px JPEG'e küçültülür → `claude-opus-5-5` yapılandırılmış çıktıyla (`betaZodOutputFormat`) değerleri okur → her değer kayıt şemasından geçer (geçmeyen düşer) → form DOLU açılır, kayıt kullanıcının onayıyla. Görsel SAKLANMAZ.
- **Yorum:** "Değerlendir" ile istek üzerine; son 90 günün ölçümleri (serbest NOT gönderilmez) hekim + diyetisyen gözüyle; tanı/ilaç yok, ciddi işarette "doktora danış". Sonuç saklanmaz.
- **Gizlilik/denetim:** her gönderim istekten ÖNCE `AuditLog`a `EXPORT` (hedef Anthropic, değer yok). Anahtar yoksa hiçbir şey gönderilmez, ekran söyler.
- **Ret:** sunucu tarafı yedek (`fallbacks: "default"`); `refusal` anlaşılır hata.
- **Anahtar:** `ANTHROPIC_API_KEY` yalnızca sunucu `.env`'inde (sahibi yazar); compose `uygulama`ya geçirir.

### Ek (2026-10-30) — Face ID ile giriş (passkey)

- **Neden:** oturum 24 saat; telefonda her gün e-posta + şifre + TOTP yazılıyordu.
- **Nasıl:** Auth.js'e ikinci Credentials sağlayıcısı (`passkey`). WebAuthn doğrulaması `@simplewebauthn/server` ile `server/auth/passkey.ts`te; jeton şifreli girişle aynı yoldan (`applyLoginClaims`).
- **Güçlü faktör:** passkey (cihazda kalan anahtar + biyometri, `userVerification: required`, alan adına bağlı) şifre + TOTP'nin YERİNE geçer.
- **Meydan okuma:** veritabanında, 5 dk, doğrulamada tek adımda silinerek tüketilir (tekrar saldırısı yok). Oturumsuz üretim için açık meydan okuma tavanı 100.
- **Köken:** üretimde yalnızca site adresi; geliştirmede `localhost:*`; CI'da tam eşleşen `PASSKEY_TEST_KOKENI`.
- **Kilit ve sayım:** başarısız passkey denemesi şifreli girişle aynı kilit politikasına sayılır; kilitli hesap passkey ile de açılmaz.
- **Ekleme/silme:** Ayarlar → Güvenlik; oturum + yazma kapısı + denetim kaydı.
- **Permissions-Policy:** `publickey-credentials-get=()` → `(self)`. Kapalıyken giriş sayfasında WebAuthn tarayıcıda engelleniyordu (e2e ile yakalandı).
- **Test:** Chromium sanal doğrulayıcısıyla gerçek kriptografili e2e (`passkey.spec.ts`).

### Ek (2026-10-30) — Bildirimler (web push)

- **Ne:** ödeme günü (2 gün önce + gününde, 09:00), kalan alışkanlıklar (21:00), su (11/15/18, 3,5 L altındaysa).
- **Kanal:** web push (`web-push` + VAPID). iPhone'da yalnızca ana ekrana eklenmiş panelde (iOS 16.4+). Service worker `/sw.js`; adı `/panel` ile başlamıyor (ara katman). Önbellek yok.
- **Zamanlayıcı:** uygulama sürecinin içinde (`instrumentation-node.ts`), 5 dakikada bir. Ayrı cron yok.
- **Planlama:** `planla()` saf; saat pencereleri sayesinde geç kalkan sunucu eski hatırlatmaları yığmaz.
- **Tekrar önleme:** (tür, anahtar, gün) veritabanında eşsiz; yeniden başlatma aynı bildirimi ikinci kez gönderemez. Kayıtlar 30 gün tutulur.
- **SSRF önlemi:** abonelik uç noktası yalnızca Apple/Google/Mozilla/Microsoft push kökenleri; sona eren abonelik (404/410) silinir.
- **Derleme dersi:** `instrumentation.ts` içinde erken dönüşlü (`!== 'nodejs' return`) dinamik içe aktarma Edge paketinden ATILMADI ve `web-push` derlemeyi kırdı. Belgelenen kalıp: `if (NEXT_RUNTIME === 'nodejs') await import('./instrumentation-node')`.

### Ek (2026-10-31) — Çevrimdışı çalışma

- **Service worker:** yalnızca `/panel` gezinmeleri, ağ önce; ağ yoksa statik "Bağlantı yok" sayfası. Panel sayfaları ÖNBELLEĞE ALINMAZ — kişisel finans ve sağlık verisi cihazda birikmesin. Yani çevrimdışıyken eski veriler GÖRÜNMEZ.
- **Kuyruk:** hızlı kayıtlar (harcama, kilo, su) ağ hatasında `localStorage`da bekler, bağlantı gelince girildiği günün tarihiyle gönderilir, gönderilince silinir. Sunucu gelecek ve 30 günden eski günü bugüne çeker.
- **Tekrar önleme:** her kayıt tek kullanımlık anahtar taşır (`islem_anahtari`); anahtar işle aynı işlemde yazılır. Yanıtı kaybolan istek yeniden gelince ikinci kez yazılmaz.
- **Kapsam dışı:** hızlı kayıt dışındaki formlar (ör. hesap ekleme) kuyruğa girmez.
- **Ders:** bağlantı yokken `router.refresh()` tam yeniden yükleme yapıyor ve kullanıcıyı çevrimdışı ekranına atıyordu; kuyruk yolunda yenileme yok.

### Ek (2026-11-10) — Takvim

- **Ne:** `/panel/takvim` — Ay, Hafta (saat ızgarası, tüm gün satırı, şimdi çizgisi), Gün ve Ajanda. Görünüm ve tarih adreste (`?gorunum=ay&tarih=2026-11-10`): sunucuda çizilir, bağlantı paylaşılabilir, geri tuşu çalışır. Hafta pazartesi başlar, ad ve saatler Türkçe/24 saat. Telefonda hafta ızgarası kutunun içinde yatay kayar; sayfa taşmaz. Bugün panosunda "Bugünün takvimi" kartı; menüde ayrı "Plan" grubu (alt sekmeler beşte kalır).
- **Şema:** `TakvimEtkinligi` — başlık, açıklama, konum, kategori (Spor, Toplantı, Sağlık/Doktor, Hatırlatıcı, Kişisel, İş, Diğer), tüm gün, `baslangic`/`bitis` (GERÇEK ANLAR; tüm günde ilk günün İstanbul 00:00'ı → son günün ertesi 00:00'ı), tekrar (yok/günlük/haftalık+günler/aylık/yıllık, aralık, bitiş günü ya da sayı), istisna GÜNLERİ (`@db.Date[]`), hatırlatma dakikaları (`Int[]`), `seriId` ("yalnızca bu" düzenlemesinin serisi; seri silinince o da gider). `BildirimTercihi.takvim` (varsayılan açık). Göç yalnızca EKLEME.
- **Tekrar tek satır:** oluşumlar okunurken `src/lib/takvim/tekrar.ts`te (SAF) açılır. Kural Google ile aynı: ayın 31'i olmayan ay ATLANIR (kırpılmaz), 29 Şubat yalnızca artık yılda, sayı istisnadan önceki ADAYLARA uygulanır (RFC 5545 COUNT). Oluşum duvar saatinde kalır (`appWallClockInstant`; Türkiye'de yaz saati yok ama sabit 24 saat eklemek yazılmadı).
- **Kapsam:** tekrarlayan etkinlikte düzenleme ve silme "Yalnızca bu / Bu ve sonrakiler / Tüm etkinlikler" sorar (tarayıcı `confirm`ü yok, pencerenin içinde). Yalnızca bu = istisna + seriye bağlı ayrı etkinlik; bu ve sonrakiler = seri bir gün önce biter (sayı sınırı bölüştürülür), yeni seri açılır; tümü = tıklanan oluşumdaki tarih/saat farkı serinin BAŞINA uygulanır.
- **Hatırlatma:** etkinlik başına en çok 5, en uzun 4 hafta önce; hazır seçenekler + özel sayı/birim. Tüm günde çapa o günün 09:00'ı ("1 gün önce 09:00"). Varsayılan: saatli 30 dk önce, tüm gün aynı gün 09:00.
- **Zamanlayıcı:** genel bildirim turu 5 dakikada kalır; takvim için AYRI, dakikalık ve dakikanın 2. saniyesine hizalı tur (`takvim-bildirim.ts`) — yalnızca takvimi okur, gecikme en çok birkaç saniye. Önceki tur bitmeden yenisi başlamaz. Gönderim: vakti geldikten sonraki 15 dakika içinde ve etkinlik bitmeden; sunucu kapalı kaldıysa eski hatırlatmalar yığılmaz. Tekrar önleme mevcut `bildirim_kaydi` eşsizliğiyle: anahtar etkinlik + oluşum başlangıcı + öncelik, gün hatırlatma anının günü. Ulaşılamazsa satır silinir, sonraki dakika yeniden dener.
- **Metin:** başlık kategori ("🩺 Sağlık / Doktor"), gövde "Diş hekimi · 14:30'da (30 dk sonra) · Kadıköy" — Türkçe ek söylenişe göre (14:00'te, 14:30'da). Adres takvimi o günün Gün görünümünde açar.
- **Gizlilik/denetim:** her mutasyon `AuditLog`a yazılır ama yalnızca alan sayıları, tekrar türü ve kapsam — başlık, konum, açıklama YAZILMAZ (doktor randevusu sağlık verisi olabilir). `takvim` modülü `kisisel-veri-erisimi` kapısındaki kişisel modüller listesinde: servis ve eylem panel ile sunucu katmanı dışında içe aktarılamaz.
- **Bağımlılık yok:** ızgara Tailwind ile elle; FullCalendar ve benzeri eklenmedi. Renkler `dark:` varyantı olmadan iki temada okunur (dolu zemin beyaz yazı, açık zemin `/15` saydamlık).

### Ek (2026-11-12) — Spor ↔ Takvim, hareket ekleme denetimi

- **Spor programı takvimde:** program günü (ör. "İtiş") Spor → Program → gün → "Takvime ekle" ile haftalık tekrarlanan bir Spor etkinliği olur (hafta günleri, saat, süre — varsayılan 75 dk —, başlangıç, isteğe bağlı bitiş, takvimin hatırlatma seçicisi). Başlık günün adı, açıklama odağı. Her gün kendi günlerine ayrı planlanır.
- **Şema:** `TakvimEtkinligi.programDayId` (isteğe bağlı, `onDelete: SetNull`, eklemeli göç). "Yalnızca bu" / "Bu ve sonrakiler" bölmeleri bağı taşır. Etkinlik ayrıntısında "Antrenmana başla" mevcut oturum başlatma eylemini çağırır; arşivlenmiş günde gösterilmez.
- **Çift yok:** aynı gün için süren (bitişi geçmemiş) bir plan varken ikinci ekleme CONFLICT döner, ekran mevcut planı düzenlemeyi önerir. Plan güncellemesi istisnaları sıfırlar (günler/saat değişmiş olabilir).
- **Hareket adı tekilliği Türkçe harf duyarsız:** `name @unique` harfe duyarlı ve Postgres `insensitive` "I/ı/İ/i"yi Türkçe eşlemiyor; servis önce birebir (harf duyarsız) sorgu, sonra bellekte `egzersizAdAnahtari` karşılaştırması yapar. Arşivdeki eş ad "arşivde" der ve geri almayı önerir; seçicilerden hızlı eklemede eş ad yeni satır açmaz (aktifse seçilir, arşivdeyse arşivden çıkarılır).
- **Boş oturum:** hareketsiz günün oturum ekranında hareket eklenebilir ya da oturumdan vazgeçilir (set yoksa silinir). Bugün başka bir program gününden açılmış ve HİÇ set girilmemiş oturum yeni günün "Başlat"ını kilitlemez (silinir); set girilmiş oturum korunur.

---

## ADR-049 — Public Site Tek Sayfa: Profil + Sosyal Bağlantılar

**Tarih:** 2026-11-08 · **Durum:** Kabul edildi · ADR-019/026/027/045/046/047'nin public site kısmının yerine geçer.

### Bağlam

sahinsamet.com için istenen public yüz bir kartvizit sayfası: fotoğraf, ad, kısa tanıtım, konum ve sosyal bağlantılar. Projeler, blog, CV, hakkımda, hizmetler, iletişim formu ve İngilizce/Almanca sürümler istenmiyor. Panel (Bugün, Cüzdan, Hayat, Spor, Sağlık, İngilizce, ayarlar) aynen kalıyor.

### Karar

1. `/` tek public sayfa; içerik tamamen `Profile` kaydından (`headline`, `bio`, `location`, `socials`, `avatar`). Boş alanlar hiç çizilmez.
2. `Profile` tekil satır, sabit kimlik `singleton`; `locale`, `subtitle`, `availability`, `cv` sütunları kaldırıldı. `Skill`, `Project`, `Post`, `Experience`, `Service`, `ContactMessage` modelleri ve enum'ları silindi; `AttachmentEntity` yalnızca `PROFILE`.
3. `socials` `socialsSchema` ile bağlı: Instagram, X, LinkedIn, YouTube, TikTok, GitHub, web sitesi (http/https, platformun kendi alan adında) ve e-posta (`mailto:` olarak çizilir). Okuma yolunda da süzülür (`socialsOku`).
4. Önbellek tek girdi tek etiket: `content:profile`; panelde kaydetmek ve fotoğraf yüklemek/silmek onu düşürür.
5. Paylaşım görseli `/og` (ad + tanıtım satırı), sorgu parametresi metne girmez.
6. Geçmiş migration'lar yerine tek başlangıç migration'ı (`prisma/migrations/*_baslangic`): yeni proje, boş veritabanı.

### Sonuçlar

- Kaldırılan rotaların, servislerin, şemaların ve testlerin tamamı silindi; kapı testlerinin kayıtları (rota kapsamı, ulaşılamaz ihraçlar, tarih sütunu eşleşmesi, ağır yığınlar) buna göre güncellendi.
- MDX/RSS bağımlılıkları (`next-mdx-remote`, `rehype-sanitize`, `remark-gfm`) ve kullanılmayan `recharts`, `date-fns`, `@auth/prisma-adapter` kaldırıldı.

