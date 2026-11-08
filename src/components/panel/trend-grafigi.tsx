'use client';

import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';

/**
 * TREND GRAFİĞİ — §4.2 `/panel/saglik` "trend grafikleri", T-113.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN RECHARTS DEĞİL — `agir-yigin-tembel` KAPISI VE ÖLÇÜ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Recharts ~109,5 kB ve §5.2 kapısı onu YALNIZCA `yillik-grafik.tsx`in tembel
 * sınırından geçiriyor (`tekIceAktaran: true`). Buradaki ihtiyaç tek serili
 * bir çizgi: birkaç yüz satırlık SVG. İkinci bir Recharts içe aktaranı açmak
 * hem kapının kuralını gevşetmeyi hem de panel sayfasına 109 kB eklemeyi
 * gerektirirdi — kazanç olmadan.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TASARIM KARARLARI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * - TEK SERİ, TEK EKSEN: ölçüler (kg, saat, bpm, adım) farklı ölçekte; ikisini
 *   tek grafiğe koymak çift eksen ister ve çift eksen okunmaz. Her ölçü kendi
 *   küçük grafiğinde (küçük katlar). Tek seri → gösterge kutusu yok, başlık
 *   seriyi adlandırıyor.
 * - Y EKSENİ SIFIRDAN BAŞLAMIYOR: çizgi grafikte değişimi gösteren şey eğim;
 *   82 kg'lık bir seriyi 0'dan çizmek 1 kg'lık değişimi düz çizgiye çevirir.
 *   Eksen değer aralığına %10 pay ekleniyor.
 * - EKSİK GÜN İNTERPOLE EDİLMİYOR AMA ÇİZGİ KESİLMİYOR: noktalar yalnızca ölçüm
 *   olan günlerde; aradaki çizgi iki ölçümü birleştiriyor. X ekseni GERÇEK
 *   gün ölçeği, yani iki ölçüm arasındaki boşluk yatayda görünür kalıyor.
 * - X EKSENİ ÖLÇÜMLERİN KAPSADIĞI GÜNLER (ilk → son ölçüm), seçilen aralık
 *   DEĞİL. T-116'da ekran görüntüsüyle ölçüldü: 365 günlük eksende dört
 *   ardışık ölçüm ~6 px'e sıkışıp DİKEY BİR ÇİZGİ gibi okunuyordu. Bunun
 *   bedeli "veri ne zaman kesildi" bilgisinin eksenden düşmesi; o bilgi
 *   başlığa taşındı (son ölçümün GÜNÜ değerin yanında) ve eksen uçları
 *   gerçek tarihleri yazıyor.
 * - DEĞER DİZEDEN: DTO ölçüleri `string` (ADR-014/D). Çizim için `Number`a
 *   çevriliyor — burada hesap değil GEOMETRİ, ve gösterilen etiket her zaman
 *   sunucudan gelen dizenin kendisi.
 * - ETKİLEŞİM: imleç en yakın GÜNE yapışan dikey çizgi + ipucu; klavyede
 *   ← → ile nokta nokta gezilir. Tablo görünümü `<details>` içinde.
 */

export type TrendNoktasi = {
  /** `YYYY-MM-DD` */
  gun: string;
  /** Sunucudan gelen değer — gösterimde OLDUĞU GİBİ kullanılır. */
  deger: string;
};

const GEN = 640;
const YUK = 176;
const PAD = { sol: 52, sag: 12, ust: 12, alt: 30 };

const gunMs = (gun: string): number => Date.parse(`${gun}T00:00:00Z`);

/** Ekran gösterimi: `82.50` → `82,50`. */
const tr = (deger: string): string => {
  const [tam = '', kesir] = deger.split('.');
  const gruplu = tam.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return kesir === undefined ? gruplu : `${gruplu},${kesir}`;
};

const KISA_TARIH = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
/** `2026-08-04` → `4 Ağu` — eksen ve başlıkta; tabloda tam gün kalır. */
const kisaTarih = (gun: string): string => KISA_TARIH.format(new Date(gunMs(gun)));

function eksenAdimlari(min: number, max: number): number[] {
  if (min === max) return [min];
  const aralik = max - min;
  const kaba = aralik / 3;
  const kuvvet = 10 ** Math.floor(Math.log10(kaba));
  const adim = [1, 2, 5, 10].map((k) => k * kuvvet).find((a) => a >= kaba) ?? kaba;
  const bas = Math.ceil(min / adim) * adim;
  const sonuc: number[] = [];
  for (let v = bas; v <= max + 1e-9; v += adim) sonuc.push(Number(v.toFixed(6)));
  return sonuc;
}

function eksenEtiketi(v: number): string {
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}B`;
  return String(Number(v.toFixed(2))).replace('.', ',');
}

export function TrendGrafigi({
  baslik,
  birim,
  noktalar,
  renk = 'var(--color-accent)',
}: {
  baslik: string;
  /** `kg`, `sa`, `bpm`… — etikete eklenir. */
  birim: string;
  noktalar: readonly TrendNoktasi[];
  /** Çizgi ve dolgu rengi — iki temada da okunan doygun bir ton. */
  renk?: string;
}) {
  const kimlik = useId();
  // `useId` iki nokta üst üste içerir; `url(#…)` içinde güvenli olsun diye atılır.
  const dolguId = `dolgu${kimlik.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [secili, setSecili] = useState<number | null>(null);

  const geometri = useMemo(() => {
    if (noktalar.length === 0) return null;

    const degerler = noktalar.map((n) => Number(n.deger));
    let min = Math.min(...degerler);
    let max = Math.max(...degerler);
    const pay = (max - min) * 0.1 || Math.max(Math.abs(max) * 0.05, 1);
    min -= pay;
    max += pay;

    /* Tek ölçüm (ya da hepsi aynı gün) → nokta ortada, bir gün pay. */
    const ilkMs = gunMs(noktalar[0]?.gun ?? '');
    const sonMs = gunMs(noktalar.at(-1)?.gun ?? '');
    const x0 = ilkMs === sonMs ? ilkMs - 86_400_000 : ilkMs;
    const x1 = ilkMs === sonMs ? sonMs + 86_400_000 : sonMs;
    const icGen = GEN - PAD.sol - PAD.sag;
    const icYuk = YUK - PAD.ust - PAD.alt;

    const x = (gun: string) => PAD.sol + ((gunMs(gun) - x0) / (x1 - x0)) * icGen;
    const y = (v: number) => PAD.ust + (1 - (v - min) / (max - min)) * icYuk;

    const konumlar = noktalar.map((n, i) => ({ x: x(n.gun), y: y(degerler[i] ?? 0) }));
    const yol = konumlar
      .map((k, i) => `${i === 0 ? 'M' : 'L'}${k.x.toFixed(1)},${k.y.toFixed(1)}`)
      .join('');

    return {
      konumlar,
      yol,
      alan: `${yol}L${(konumlar.at(-1)?.x ?? 0).toFixed(1)},${YUK - PAD.alt}L${(konumlar[0]?.x ?? 0).toFixed(1)},${YUK - PAD.alt}Z`,
      adimlar: eksenAdimlari(min + pay, max - pay).map((v) => ({ v, y: y(v) })),
    };
  }, [noktalar]);

  const son = noktalar.at(-1);
  const ilk = noktalar[0];

  if (!geometri || !son || !ilk) {
    return (
      <figure className="border-line bg-surface rounded-card flex flex-col gap-2 border p-4">
        <figcaption className="text-primary text-sm font-medium">{baslik}</figcaption>
        <p className="text-muted text-sm">Bu aralıkta ölçüm yok.</p>
      </figure>
    );
  }

  const enYakin = (olay: PointerEvent<SVGSVGElement>) => {
    const kutu = olay.currentTarget.getBoundingClientRect();
    const svgX = ((olay.clientX - kutu.left) / kutu.width) * GEN;
    let enIyi = 0;
    geometri.konumlar.forEach((k, i) => {
      if (Math.abs(k.x - svgX) < Math.abs((geometri.konumlar[enIyi]?.x ?? 0) - svgX)) enIyi = i;
    });
    setSecili(enIyi);
  };

  const klavye = (olay: KeyboardEvent<SVGSVGElement>) => {
    if (olay.key !== 'ArrowLeft' && olay.key !== 'ArrowRight') return;
    olay.preventDefault();
    const yon = olay.key === 'ArrowRight' ? 1 : -1;
    setSecili((onceki) => {
      const bas = onceki ?? (yon === 1 ? -1 : noktalar.length);
      return Math.min(noktalar.length - 1, Math.max(0, bas + yon));
    });
  };

  const seciliNokta = secili !== null ? noktalar[secili] : undefined;
  const seciliKonum = secili !== null ? geometri.konumlar[secili] : undefined;
  const fark = Number(son.deger) - Number(ilk.deger);

  return (
    <figure className="border-line bg-surface rounded-card flex flex-col gap-3 border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <figcaption className="text-muted flex items-center gap-2 text-xs font-medium">
            <span aria-hidden="true" className="size-2 rounded-full" style={{ background: renk }} />
            {baslik}
          </figcaption>
          <p className="text-primary">
            <span className="tabular text-2xl font-semibold tracking-tight">{tr(son.deger)}</span>{' '}
            <span className="text-muted text-sm">{birim}</span>
          </p>
          <p className="text-muted text-xs">{kisaTarih(son.gun)}</p>
        </div>
        {noktalar.length > 1 && (
          <span
            className="tabular bg-elevated text-primary shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
            title="İlk ölçümden bu yana"
          >
            {fark > 0 ? '↑ +' : fark < 0 ? '↓ ' : ''}
            {tr(String(Number(fark.toFixed(2))))}
          </span>
        )}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${GEN} ${YUK}`}
          className="focus-ring h-auto w-full touch-pan-y overflow-visible rounded-sm"
          role="img"
          aria-label={`${baslik}: ${noktalar.length} ölçüm, son değer ${tr(son.deger)} ${birim}. Ok tuşlarıyla noktalar arasında gezinebilirsin.`}
          aria-describedby={`${kimlik}-tablo`}
          tabIndex={0}
          onPointerMove={enYakin}
          onPointerLeave={() => setSecili(null)}
          onKeyDown={klavye}
          onBlur={() => setSecili(null)}
        >
          <defs>
            <linearGradient id={dolguId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={renk} stopOpacity={0.28} />
              <stop offset="100%" stopColor={renk} stopOpacity={0} />
            </linearGradient>
          </defs>

          {geometri.adimlar.map((a) => (
            <g key={a.v}>
              <line
                x1={PAD.sol}
                x2={GEN - PAD.sag}
                y1={a.y}
                y2={a.y}
                stroke="var(--color-line)"
                strokeWidth={1}
                strokeDasharray="3 4"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={PAD.sol - 6}
                y={a.y}
                textAnchor="end"
                dominantBaseline="middle"
                fill="var(--color-muted)"
                fontSize={14}
              >
                {eksenEtiketi(a.v)}
              </text>
            </g>
          ))}

          <text x={PAD.sol} y={YUK - 6} fill="var(--color-muted)" fontSize={14}>
            {kisaTarih(ilk.gun)}
          </text>
          <text
            x={GEN - PAD.sag}
            y={YUK - 6}
            textAnchor="end"
            fill="var(--color-muted)"
            fontSize={14}
          >
            {kisaTarih(son.gun)}
          </text>

          {noktalar.length > 1 && (
            <path d={geometri.alan} fill={`url(#${dolguId})`} className="grafik-dolgu" />
          )}
          <path
            d={geometri.yol}
            pathLength={1}
            className="grafik-cizgi"
            fill="none"
            stroke={renk}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {noktalar.length <= 45 &&
            geometri.konumlar.map((k, i) => (
              <circle
                key={noktalar[i]?.gun}
                cx={k.x}
                cy={k.y}
                r={3}
                fill={renk}
                stroke="var(--color-surface)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            ))}

          {seciliKonum && (
            <>
              <line
                x1={seciliKonum.x}
                x2={seciliKonum.x}
                y1={PAD.ust}
                y2={YUK - PAD.alt}
                stroke="var(--color-muted)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={seciliKonum.x}
                cy={seciliKonum.y}
                r={5}
                fill={renk}
                stroke="var(--color-surface)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>

        {seciliNokta && seciliKonum && (
          <div
            role="status"
            className="border-line bg-elevated rounded-card pointer-events-none absolute top-0 border px-2.5 py-1.5 text-xs shadow-lg"
            style={{
              left: `${(seciliKonum.x / GEN) * 100}%`,
              transform:
                seciliKonum.x > GEN * 0.7 ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)',
            }}
          >
            <p className="text-muted tabular">{seciliNokta.gun}</p>
            <p className="text-primary tabular font-medium">
              {tr(seciliNokta.deger)} {birim}
            </p>
          </div>
        )}
      </div>

      <details className="text-sm">
        <summary className="focus-ring text-muted hover:text-primary w-fit cursor-pointer rounded-sm text-xs">
          Tablo olarak göster
        </summary>
        <table id={`${kimlik}-tablo`} className="mt-2 w-full max-w-xs text-xs">
          <caption className="sr-only">{baslik} ölçümleri</caption>
          <thead>
            <tr className="text-muted">
              <th scope="col" className="py-1 text-left font-medium">
                Gün
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                {birim}
              </th>
            </tr>
          </thead>
          <tbody>
            {noktalar.map((n) => (
              <tr key={n.gun} className="border-line border-t">
                <td className="tabular text-body py-1">{n.gun}</td>
                <td className="tabular text-body py-1 text-right">{tr(n.deger)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
