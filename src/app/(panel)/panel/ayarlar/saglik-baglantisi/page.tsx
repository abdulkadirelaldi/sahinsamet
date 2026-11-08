import type { Metadata } from 'next';

import { SaglikBaglanti } from '@/components/panel/saglik-baglanti';
import { Topbar } from '@/components/panel/topbar';
import { auth } from '@/server/auth';
import { fetchBaglanti } from '@/server/services/saglik-baglantisi';

export const metadata: Metadata = {
  title: 'iPhone sağlık verisi',
  robots: { index: false, follow: false, nocache: true },
};

const ADIMLAR = [
  'Yukarıdan anahtar üret ve kopyala.',
  'Kısayollar uygulamasında yeni kısayol aç. "Sağlık Örneklerini Bul" ekle: tür Adımlar, başlangıç bugün, "Gruplama" Gün; sonucu toplam olarak al.',
  '"URL İçeriğini Al" ekle: aşağıdaki adres, yöntem POST. Üstbilgi: Authorization = Bearer + boşluk + anahtar. Gövde JSON: adim alanına adım sonucunu koy. İstersen uyku (saat), nabiz, kilo alanlarını da ekle.',
  'Kısayolu bir kez elle çalıştır; yukarıda "Son veri" görünmeli.',
  'Otomasyon sekmesinde "Günün saati" ile her akşam 23:00\'e bağla, "Hemen Çalıştır"ı seç.',
];

/** `/panel/ayarlar/saglik-baglantisi` — Kısayollar anahtarı ve kurulum (2026-11-01). */
export default async function SaglikBaglantisiPage() {
  const session = await auth();
  const baglanti = session?.user?.id ? await fetchBaglanti(session.user.id) : null;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  return (
    <>
      <Topbar title="iPhone sağlık verisi" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <SaglikBaglanti baglanti={baglanti} />
          <section className="rounded-card border-line bg-surface flex flex-col gap-3 border p-5">
            <h2 className="text-primary text-base">Kurulum</h2>
            <ol className="text-body flex list-decimal flex-col gap-2 pl-5 text-sm">
              {ADIMLAR.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ol>
            <code className="bg-elevated text-primary rounded-xl p-3 text-xs break-all">
              {site}/api/v1/saglik/olcum
            </code>
            <pre className="bg-elevated text-primary overflow-x-auto rounded-xl p-3 text-xs">
              {'{ "adim": 8432, "uyku": 7.5, "nabiz": 58, "kilo": 87.5 }'}
            </pre>
            <p className="text-muted text-xs">
              Yalnızca gönderdiğin alanlar yazılır, aynı gün yeniden gönderince güncellenir. Saat
              23:00&apos;ten sonraki adımlar ertesi gönderimde o güne yazılmaz.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
