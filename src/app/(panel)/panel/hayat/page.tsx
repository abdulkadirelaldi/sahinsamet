import { Settings2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { GunlukListe } from '@/components/panel/gunluk-liste';
import { HayatAltMenu } from '@/components/panel/hayat-alt-menu';
import { sureBicim } from '@/components/panel/hayat-bicim';
import { HayatIstatistik, HayatUstKarti } from '@/components/panel/hayat-ust';
import { IsiHaritasi, Seriler } from '@/components/panel/hayat-seri';
import { OnerilenAliskanliklar } from '@/components/panel/onerilen-aliskanliklar';
import { Topbar } from '@/components/panel/topbar';
import { buttonClasses } from '@/components/ui/button';
import { dayDateSchema } from '@/lib/schemas/common';
import { addAppDays, appToday } from '@/server/services/_shared';
import { fetchHabitWeek, gunOranlari } from '@/server/services/habit';
import { fetchHabitDay, fetchIsiHaritasi, type GunlukListeDto } from '@/server/services/habit-gun';

export const metadata: Metadata = {
  title: 'Hayat',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const tek = (ham: string | string[] | undefined): string =>
  (Array.isArray(ham) ? ham[0] : ham) ?? '';

function gunEtiketi(gun: string, bugun: string): string {
  if (gun === bugun) return 'Bugün';
  if (gun === addAppDays(bugun, -1)) return 'Dün';
  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${gun}T00:00:00Z`));
}

/**
 * HAYAT · BUGÜN (2026-10-29, telefon öncelikli yeniden yazım).
 *
 * Sahibi alışkanlıklarını her gün SIRAYLA işaretliyor: yaptım ya da yapmadım.
 * Ekran o akış için: gün seçici (geçmiş günler düzeltilebilir, gelecek yok),
 * ilerleme, sıralı liste ve "günün raporu" — hangisini yapmadın, hangisi eksik
 * kaldı, hangisini hiç işaretlemedin.
 */
export default async function HayatPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const bugun = appToday();
  const istenen = dayDateSchema.safeParse(tek(parametreler.gun));
  const gun = istenen.success && istenen.data <= bugun ? istenen.data : bugun;

  const [liste, hafta, isi] = await Promise.all([
    fetchHabitDay(gun, undefined, bugun),
    fetchHabitWeek(gun),
    fetchIsiHaritasi(undefined, bugun),
  ]);
  const { ozet } = liste;
  const haftaOranlari = gunOranlari(hafta);
  // Yüzde yalnızca GEÇMİŞ + bugün üzerinden: gelecek günler ortalamayı düşürmesin.
  const gecenOranlar = haftaOranlari.filter((_, i) => (hafta.days[i] ?? '') <= bugun);
  const haftaYuzdesi = Math.round(
    (gecenOranlar.reduce((t, o) => t + o, 0) / Math.max(1, gecenOranlar.length)) * 100,
  );
  const seriMetinleri = Object.fromEntries(
    hafta.habits
      .filter((h) => h.streak.value > 0)
      .map((h) => [h.id, `${h.streak.value} ${h.streak.unit === 'day' ? 'gün' : 'hafta'}`]),
  );
  const enUzunSeri = [...hafta.habits]
    .filter((h) => h.streak.value > 0)
    .sort((a, b) => b.streak.value - a.streak.value)[0];
  const aktifGun = isi.filter((h) => h.oran !== null && h.oran > 0).length;
  const etiket = gunEtiketi(gun, bugun);

  return (
    <>
      <Topbar
        title="Hayat"
        actions={
          <Link
            href="/panel/hayat/aliskanliklar"
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            <Settings2 className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Alışkanlıkları düzenle</span>
            <span className="sr-only sm:hidden">Alışkanlıkları düzenle</span>
          </Link>
        }
      />

      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <HayatAltMenu aktif="genel" />

          <HayatUstKarti
            etiket={etiket}
            gun={gun}
            bugun={bugun}
            gunler={hafta.days}
            oranlar={haftaOranlari}
            yapildi={ozet.yapildi}
            toplam={ozet.toplam}
          />

          {ozet.toplam === 0 ? (
            <section className="rounded-card border-line bg-surface flex flex-col items-center gap-4 border p-6 text-center">
              <p className="text-primary font-semibold">Henüz alışkanlık yok</p>
              <p className="text-muted text-sm">
                Her gün işaretleyeceğin listeyi tek dokunuşla ekleyebilir ya da kendin
                oluşturabilirsin.
              </p>
              <OnerilenAliskanliklar />
              <Link
                href="/panel/hayat/aliskanliklar/yeni"
                className="text-accent text-sm font-medium"
              >
                Kendim ekleyeceğim
              </Link>
            </section>
          ) : (
            <>
              <GunlukListe
                gun={gun}
                bugunMu={gun === liste.bugun}
                items={liste.items}
                seriler={seriMetinleri}
              />

              <GunRaporu liste={liste} etiket={etiket} />

              <HayatIstatistik
                kalemler={[
                  { etiket: 'Bu hafta', deger: `%${haftaYuzdesi}` },
                  {
                    etiket: 'En uzun seri',
                    deger: enUzunSeri ? `🔥 ${enUzunSeri.streak.value}` : '—',
                    ...(enUzunSeri
                      ? { ek: enUzunSeri.streak.unit === 'day' ? 'gün' : 'hafta' }
                      : {}),
                  },
                  { etiket: 'Aktif gün', deger: String(aktifGun), ek: '/ yıl' },
                ]}
              />

              <Seriler aliskanliklar={hafta.habits} />
              <IsiHaritasi hucreler={isi} />
            </>
          )}
        </div>
      </main>
    </>
  );
}

/**
 * "Günün raporu" — sahibinin istediği dil: "bugün bunu yapmadın, bunu eksik
 * yaptın". İşaretlenmemişler AYRI: "yapmadın" demek, söylenmemiş bir şeyi
 * iddia etmek olurdu.
 */
function GunRaporu({ liste, etiket }: { liste: GunlukListeDto; etiket: string }) {
  const { items, ozet } = liste;
  const yapilmadi = items.filter((i) => i.durum === 'YAPILMADI');
  const eksik = items.filter((i) => i.durum === 'EKSIK');
  const isaretsiz = items.filter((i) => i.durum === 'ISARETSIZ');
  const gecmis = liste.gun < liste.bugun;
  const zaman = etiket === 'Bugün' ? 'bugün' : etiket === 'Dün' ? 'dün' : 'o gün';

  return (
    <section
      aria-labelledby="gun-raporu"
      className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4"
    >
      <h2 id="gun-raporu" className="text-primary text-base font-semibold">
        Günün raporu
      </h2>

      {ozet.yapildi === ozet.toplam ? (
        <p className="text-success text-sm font-medium">
          Tebrikler — {zaman} hepsini tamamladın. 🎉
        </p>
      ) : (
        <ul className="text-body flex flex-col gap-2 text-sm">
          {yapilmadi.length > 0 && (
            <li>
              <span className="text-danger font-medium">Yapmadın: </span>
              {yapilmadi.map((i) => i.name).join(', ')}
            </li>
          )}
          {eksik.length > 0 && (
            <li>
              <span className="text-warning font-medium">Eksik kaldı: </span>
              {eksik
                .map((i) =>
                  i.sureli
                    ? `${i.name} (${sureBicim(i.count)} / ${sureBicim(i.targetPerDay ?? 0)})`
                    : `${i.name} (${i.count}/${i.targetPerDay})`,
                )
                .join(', ')}
            </li>
          )}
          {isaretsiz.length > 0 && (
            <li>
              <span className="text-muted font-medium">
                {gecmis ? 'İşaretlenmedi: ' : 'Sırada: '}
              </span>
              {isaretsiz.map((i) => i.name).join(', ')}
            </li>
          )}
          {ozet.yapildi > 0 && (
            <li className="text-muted">{ozet.yapildi} alışkanlığı tamamladın.</li>
          )}
        </ul>
      )}

      <Link href="/panel/hayat/rapor" className="text-accent w-fit text-sm font-medium">
        Haftalık / aylık rapor →
      </Link>
    </section>
  );
}
