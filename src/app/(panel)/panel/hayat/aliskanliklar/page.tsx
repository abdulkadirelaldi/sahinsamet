import type { Metadata } from 'next';

import {
  ALISKANLIK_GORUNUMLERI,
  aliskanlikGorunumuBul,
} from '@/components/panel/aliskanlik-gorunumleri';
import { AliskanlikListesi } from '@/components/panel/aliskanlik-listesi';
import { HayatAltMenu, HayatGorunumSekmeleri } from '@/components/panel/hayat-alt-menu';
import { aliskanliklarYolu } from '@/components/panel/hayat-bicim';
import { Sayfalama } from '@/components/panel/sayfalama';
import { Topbar } from '@/components/panel/topbar';
import { habitFilterSchema } from '@/lib/schemas/habit';
import { fetchHabits } from '@/server/services/habit';

export const metadata: Metadata = {
  title: 'Alışkanlıklar',
  robots: { index: false, follow: false, nocache: true },
};

const SAYFA_BOYUTU = 25;

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const tek = (ham: string | string[] | undefined): string =>
  (Array.isArray(ham) ? ham[0] : ham) ?? '';

function sayfaNumarasi(ham: string | string[] | undefined): number {
  const sayi = Number(tek(ham));
  return Number.isInteger(sayi) && sayi > 0 ? sayi : 1;
}

/**
 * `/panel/hayat/aliskanliklar` — alışkanlık YÖNETİMİ (§4.2). İşaretleme burada
 * değil, genel bakıştaki haftalık panoda; burası tanımlar ve arşiv.
 *
 * Görünüm anahtarı KAPALI KÜME (`aliskanlik-gorunumleri.ts`); filtre yine de
 * `habitFilterSchema`dan geçiyor — adres çubuğu kullanıcı girdisidir (ADR-032).
 */
export default async function AliskanliklarPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const gorunum = aliskanlikGorunumuBul(tek(parametreler.gorunum) || 'hepsi');
  const sayfa = sayfaNumarasi(parametreler.sayfa);

  const cozum = habitFilterSchema.safeParse({
    ...gorunum.filtre,
    page: sayfa,
    perPage: SAYFA_BOYUTU,
  });

  const liste = await fetchHabits(
    cozum.success ? cozum.data : { ...gorunum.filtre, page: 1, perPage: SAYFA_BOYUTU },
  );

  return (
    <>
      <Topbar title="Alışkanlıklar" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl min-w-0 flex-col gap-6">
          <HayatAltMenu aktif="aliskanliklar" />

          <HayatGorunumSekmeleri
            etiket="Alışkanlık görünümleri"
            gorunumler={ALISKANLIK_GORUNUMLERI}
            aktif={gorunum.anahtar}
            yol={(anahtar) => aliskanliklarYolu({ gorunum: anahtar })}
          />

          <p className="text-muted max-w-2xl text-sm">
            Alışkanlıklar <span className="text-body">silinmez, arşivlenir</span> — silmek geçmiş
            işaretlerin tamamını götürürdü. Ara vermek için formdaki &ldquo;Panoda göster&rdquo;
            kutusunu kaldır; arşiv ise &ldquo;bıraktım&rdquo; demek.
          </p>

          <AliskanlikListesi
            aliskanliklar={liste.items}
            toplam={liste.total}
            bosBaslik={gorunum.bosBaslik}
            bosAciklama={gorunum.bosAciklama}
          />

          <Sayfalama
            sayfa={liste.page}
            perPage={liste.perPage}
            toplam={liste.total}
            yol={(s) => aliskanliklarYolu({ gorunum: gorunum.anahtar, sayfa: s })}
          />
        </div>
      </main>
    </>
  );
}
