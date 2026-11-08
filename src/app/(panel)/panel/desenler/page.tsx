import type { Metadata } from 'next';

import { DesenGosterimi } from '@/components/panel/desen-gosterimi';
import { Topbar } from '@/components/panel/topbar';

export const metadata: Metadata = {
  title: 'Desenler',
  /* §8.7 — panel dizine girmez. Middleware'in `X-Robots-Tag`ine ikinci katman. */
  robots: { index: false, follow: false, nocache: true },
};

/**
 * `/panel/desenler` — T-032'nin ortak desenleri çalışır hâlde.
 *
 * NEDEN GERÇEK BİR ROTA: desenler yalnızca kodda dursaydı, "boş durumda ne
 * görünüyor" ya da "sunucu hatası alana nasıl düşüyor" sorularını yanıtlamak
 * için her seferinde bir CRUD ekranı yazmak gerekirdi. Burası panelin içinde
 * (oturum arkasında, `noindex`) ve F3'ün dört ekranı buradan kopyalayacak.
 *
 * Sayfa SUNUCU BİLEŞENİ; etkileşim tek bir istemci yaprağında.
 */
export default function DesenlerPage() {
  return (
    <>
      <Topbar title="Desenler" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-4xl flex-col gap-6">
          <p className="text-muted max-w-2xl text-sm">
            F3–F5&apos;in ekranları bu altı deseni çoğaltacak: veri tablosu, form kabuğu, arşivleme,
            boş durum, yükleniyor iskeleti ve hata sınırı. Buradaki veri sahtedir; amaç sayı
            göstermek değil, davranışı sabitlemek.
          </p>

          <DesenGosterimi />
        </div>
      </main>
    </>
  );
}
