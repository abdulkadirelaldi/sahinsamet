import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { miktarBicim } from '@/components/panel/cuzdan-bicim';
import { HesapGeriGetir } from '@/components/panel/cuzdan-formlari';
import { gunAyYil } from '@/components/panel/hayat-bicim';
import { Topbar } from '@/components/panel/topbar';
import { fetchCuzdanArsivi } from '@/server/services/cuzdan';

export const metadata: Metadata = {
  title: 'Cüzdan arşivi',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/cuzdan/arsiv` — ana ekranda görünmeyen ama silinmemiş kayıtlar (2026-11-01). */
export default async function CuzdanArsivPage() {
  const { hesaplar, borclar, sonlananlar, tarihsizler } = await fetchCuzdanArsivi();
  const bos = hesaplar.length + borclar.length + sonlananlar.length + tarihsizler.length === 0;

  return (
    <>
      <Topbar title="Cüzdan arşivi" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {bos && (
            <p className="rounded-card border-line bg-surface text-muted border p-6 text-center text-sm">
              Arşiv boş. Kapanan borçlar, kaldırılan hesaplar ve sonlandırılan kalemler burada
              görünür.
            </p>
          )}

          {tarihsizler.length > 0 && (
            <Bolum
              baslik="Tarihsiz harcamalar"
              aciklama="Tarihi olmadığı için hiçbir toplama girmiyor. Açıp tarih ekleyin."
            >
              {tarihsizler.map((a) => (
                <Baglanti
                  key={a.id}
                  href={`/panel/cuzdan/akis/${a.id}`}
                  ad={a.name}
                  deger={miktarBicim(a.amount, a.unit)}
                />
              ))}
            </Bolum>
          )}

          {borclar.length > 0 && (
            <Bolum baslik="Kapanan borçlar" aciklama="Ödeme silinirse borç yeniden açılır.">
              {borclar.map((b) => (
                <Baglanti
                  key={b.id}
                  href={`/panel/cuzdan/borc/${b.id}`}
                  ad={b.name}
                  deger={miktarBicim(b.totalAmount, b.unit)}
                />
              ))}
            </Bolum>
          )}

          {sonlananlar.length > 0 && (
            <Bolum
              baslik="Sonlandırılan gelir ve giderler"
              aciklama="Geçmiş aylar raporda kalır. Açıp yeniden başlatabilirsiniz."
            >
              {sonlananlar.map((a) => (
                <Baglanti
                  key={a.id}
                  href={`/panel/cuzdan/akis/${a.id}`}
                  ad={a.name}
                  alt={a.bitis ? gunAyYil(a.bitis) : null}
                  deger={miktarBicim(a.amount, a.unit)}
                />
              ))}
            </Bolum>
          )}

          {hesaplar.length > 0 && (
            <Bolum baslik="Kaldırılan hesaplar" aciklama="Net varlığa girmez.">
              {hesaplar.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex min-w-0 flex-col text-sm">
                    <span className="text-primary truncate font-medium">{h.name}</span>
                    <span className="tabular text-muted text-xs">
                      {miktarBicim(h.balance, h.unit)}
                    </span>
                  </span>
                  <HesapGeriGetir hesapId={h.id} ad={h.name} />
                </li>
              ))}
            </Bolum>
          )}
        </div>
      </main>
    </>
  );
}

function Bolum({
  baslik,
  aciklama,
  children,
}: {
  baslik: string;
  aciklama: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-card border-line bg-surface flex flex-col gap-1 border p-4">
      <h2 className="text-primary text-base font-semibold">{baslik}</h2>
      <p className="text-muted text-xs">{aciklama}</p>
      <ul className="divide-line mt-1 flex flex-col divide-y">{children}</ul>
    </section>
  );
}

function Baglanti({
  href,
  ad,
  alt,
  deger,
}: {
  href: string;
  ad: string;
  alt?: string | null;
  deger: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="focus-ring flex min-h-11 items-center justify-between gap-3 py-2 text-sm"
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-primary truncate font-medium">{ad}</span>
          {alt && <span className="text-muted text-xs">{alt}</span>}
        </span>
        <span className="tabular text-primary shrink-0 font-medium">{deger}</span>
      </Link>
    </li>
  );
}
