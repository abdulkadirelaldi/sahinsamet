import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { GunlukFormu } from '@/components/panel/gunluk-formu';
import { gunAyYil } from '@/components/panel/hayat-bicim';
import { Topbar } from '@/components/panel/topbar';
import { fetchJournalEntryById } from '@/server/services/journal-entry';

export const metadata: Metadata = {
  title: 'Günlük kaydı',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { params: Promise<{ id: string }> };

/**
 * `/panel/hayat/gunluk/[id]` — okuma + düzenleme + kalıcı silme.
 *
 * TAM METİN YALNIZCA BURADA (`fetchJournalEntryById`). Formu liste DTO'sundan
 * beslemek mümkün değil — liste `content` taşımıyor, yalnızca `excerpt`; o
 * özetle kaydetmek metni 240 karaktere KESMEK olurdu (T-043f'te proje
 * MDX'inde ölçülen kusurun aynı sınıfı).
 *
 * `metadata.title` SABİT ("Günlük kaydı"), kaydın başlığından üretilmiyor:
 * başlık kişisel bir metin olabilir ve tarayıcı geçmişine, sekme listesine
 * sızmasın. Üst çubuk günü yazıyor — başlık isteğe bağlı, gün her zaman var.
 */
export default async function GunlukDuzenlePage({ params }: SayfaProps) {
  const { id } = await params;
  const kayit = await fetchJournalEntryById(id);
  if (!kayit) notFound();

  return (
    <>
      <Topbar title={`Günlük · ${gunAyYil(kayit.date)}`} />
      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <GunlukFormu kayit={kayit} gun={kayit.date} />
        </div>
      </main>
    </>
  );
}
