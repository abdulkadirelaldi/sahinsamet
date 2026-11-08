# syntax=docker/dockerfile:1.7
#
# ÜRETİM İMAJI — PROGRAM.md §13.1, T-070.
#
# İKİ HEDEF, BİLİNÇLİ OLARAK AYRI:
#
#   uygulama (VARSAYILAN, son aşama) — yalnızca Next.js `standalone` çıktısı,
#     root OLMAYAN kullanıcı. Prisma CLI, pg_dump, kaynak kodu, geliştirme
#     bağımlılıkları YOK: sunucunun ihtiyacı olmayan her şey saldırı yüzeyidir.
#
#   araclar — göç (`prisma migrate deploy`) ve gece yedeği (`pg_dump`,
#     scripts/yedek-al.ts). Tam bağımlılık ağacı + PostgreSQL 16 istemcisi.
#     Coolify'da "pre-deploy" ve "scheduled task" olarak koşar; HTTP dinlemez.
#
# TABAN DEBIAN SLIM, ALPINE DEĞİL: `argon2` yerel (native) bir modül ve musl
# üzerinde önceden derlenmiş ikili her mimaride yok — derleme araç zinciri
# imaja girerdi. Debian glibc ikilileri doğrudan kullanılıyor.
#
# Node 22 (.nvmrc, ADR-008) · pnpm 9.15.0 (package.json → packageManager).

ARG NODE_IMAGE=node:22-bookworm-slim

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS taban
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# ---------------------------------------------------------------------------
FROM taban AS bagimliliklar
# Önbellek katmanı: yalnızca kilit dosyası değişince yeniden kurulur.
# `prisma/` ve `prisma.config.ts` GEREKLİ: `postinstall` → `prisma generate`.
COPY package.json pnpm-lock.yaml .npmrc prisma.config.ts ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
FROM bagimliliklar AS derleme
# ⚠️ ALAN ADI DERLEME ANINDA GEREKİYOR (T-070'te ölçüldü — ilk derleme düştü):
# `robots.txt` ve sitemap ÖN-RENDER ediliyor ve mutlak adres istiyor;
# `NEXT_PUBLIC_*` değişkenleri pakete GÖMÜLÜYOR. Coolify'da "build argument"
# olarak verilir. Alan adı DEĞİŞİRSE imaj YENİDEN DERLENMELİ — çalışma anında
# değiştirmek yetmez. Sır DEĞİL (public), imaja girmesi doğru.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY . .
# `public/` bugün YOK (her şey `src/app` altında üretiliyor); son aşamanın
# kopyası koşulsuz olsun diye boş da olsa var olmalı.
RUN mkdir -p public
# `.env` OLMADAN derleniyor (BULGU-002/T-003c: havuz tembel kurulur). Sırlar
# imaja GİRMEZ; çalışma anında ortamdan gelir (§8.17).
RUN pnpm build

# ---------------------------------------------------------------------------
FROM bagimliliklar AS araclar
# PostgreSQL 16 istemcisi — `pg_dump` sunucudan ESKİ olamaz; bookworm'un
# varsayılanı 15. Resmî PGDG deposu, imzalı.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
 && install -d /usr/share/postgresql-common/pgdg \
 && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
      -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
 && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends postgresql-client-16 \
 && apt-get purge -y curl gnupg && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*
COPY scripts ./scripts
COPY src ./src
COPY tsconfig.json ./
# ⚠️ ŞEMA MOTORU DERLEME ANINDA (T-070'te ölçüldü): Prisma `migrate deploy`
# motor ikilisini ilk çağrıda `node_modules` içine YAZIYOR; dizin root'un ve
# iş root OLMAYAN kullanıcıyla koşuyor → "Can't write to …@prisma/engines".
# Motoru burada (root iken) indirmek çalışma anındaki yazmayı ortadan kaldırıyor;
# `node_modules`u `node`a devretmek ise katmanı ikiye katlardı.
RUN pnpm exec prisma version >/dev/null
USER node
# Varsayılan iş: göç. Yedek için: `node --import ./scripts/yedek-register.mjs scripts/yedek-al.ts`
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS uygulama
# ⚠️ `HOSTNAME=0.0.0.0` AÇIKÇA (T-070'te ölçüldü): Docker `HOSTNAME`i konteyner
# KİMLİĞİNE ayarlıyor ve standalone sunucu onu DİNLEME adresi olarak alıyor —
# sunucu yalnızca konteynerin ağ arayüzünü dinliyor, `127.0.0.1` reddediliyor.
# Dışarıdan istek çalışır ama içerideki sağlık kontrolü bağlanamaz: Coolify
# konteyneri "sağlıksız" sayıp yeniden başlatma döngüsüne sokardı.
# `0.0.0.0` T-016'nın yönlendirme tuzağını (127.0.0.1/localhost MUTLAK adres
# üretiyor) TETİKLEMİYOR — o tuzak belirli bir geri döngü adresinde.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

# `next build` standalone dizinine `static/` ve `public/`u KOPYALAMAZ — eksik
# olursa sunucu ayağa kalkar ama sayfa STİLSİZ açılır ve hata da vermez
# (tests/olcum-sunucusu.mjs aynı tuzağı belgeliyor).
COPY --from=derleme --chown=node:node /app/.next/standalone ./
COPY --from=derleme --chown=node:node /app/.next/static ./.next/static
COPY --from=derleme --chown=node:node /app/public ./public

# Root OLMAYAN kullanıcı (§13.1) — resmî imajın `node` kullanıcısı (uid 1000).
USER node
EXPOSE 3000

# Sağlık: `/api/v1/health` DB + disk (§13.6). `curl` yok; Node'un kendisiyle.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
