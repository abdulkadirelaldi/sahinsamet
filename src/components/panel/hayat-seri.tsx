import { AliskanlikRozeti } from '@/components/panel/aliskanlik-rozeti';
import type { IsiHucresi } from '@/server/services/habit-gun';
import type { HabitWeekRowDto } from '@/server/services/habit';

/**
 * HAYAT · SERİLER VE YILLIK ISI HARİTASI (2026-10-30). Sunucuda çizilir.
 */

/** "🔥 12 gün" rozetleri — yalnızca süren seriler, uzundan kısaya. */
export function Seriler({ aliskanliklar }: { aliskanliklar: HabitWeekRowDto[] }) {
  const suren = aliskanliklar
    .filter((a) => a.streak.value > 0)
    .sort((x, y) => y.streak.value - x.streak.value);
  if (suren.length === 0) return null;

  return (
    <section
      aria-labelledby="seriler"
      className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4"
    >
      <h2 id="seriler" className="text-primary text-base font-semibold">
        Seriler
      </h2>
      <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
        {suren.map((a) => (
          <li key={a.id} className="bg-elevated flex w-32 shrink-0 flex-col gap-2 rounded-2xl p-3">
            <AliskanlikRozeti ad={a.name} simge={a.icon} renk={a.color} boyut="kucuk" />
            <span className="text-primary truncate text-sm font-medium">{a.name}</span>
            <span className="tabular text-warning text-sm font-semibold">
              <span aria-hidden="true">🔥 </span>
              {a.streak.atLeast ? '≥' : ''}
              {a.streak.value} {a.streak.unit === 'day' ? 'gün' : 'hafta'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const SEVIYE = [0.12, 0.32, 0.55, 0.78, 1] as const;
const AY = new Intl.DateTimeFormat('tr-TR', { month: 'short', timeZone: 'UTC' });

/**
 * Son 53 hafta — sütunlar hafta (pazartesi üstte), renk koyuluğu o gün
 * tamamlanan oran. Alışkanlık henüz yokken boş hücre.
 */
export function IsiHaritasi({ hucreler }: { hucreler: IsiHucresi[] }) {
  const hucre = 7;
  const bosluk = 2;
  const adim = hucre + bosluk;
  const haftalar = Math.ceil(hucreler.length / 7);
  const gen = haftalar * adim;
  const yuk = 7 * adim + 14;
  const aktif = hucreler.filter((h) => h.oran !== null && h.oran > 0).length;

  // Ay etiketleri: ayın ilk gününü içeren haftanın üstüne.
  const aylar = hucreler.flatMap((h, i) =>
    h.gun.endsWith('-01')
      ? [{ x: Math.floor(i / 7) * adim, ad: AY.format(new Date(`${h.gun}T00:00:00Z`)) }]
      : [],
  );

  return (
    <section
      aria-labelledby="isi-haritasi"
      className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="isi-haritasi" className="text-primary text-base font-semibold">
          Son 1 yıl
        </h2>
        <span className="text-muted text-xs">{aktif} aktif gün</span>
      </div>
      <svg
        viewBox={`0 0 ${gen} ${yuk}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Son bir yılda ${aktif} gün en az bir alışkanlık tamamlandı.`}
      >
        {aylar.map((a) => (
          <text key={`${a.x}-${a.ad}`} x={a.x} y={9} fontSize={8} fill="var(--color-muted)">
            {a.ad}
          </text>
        ))}
        {hucreler.map((h, i) => {
          const oran = h.oran ?? 0;
          const seviye = h.oran === null || oran === 0 ? -1 : SEVIYE.findIndex((s) => oran <= s);
          return (
            <rect
              key={h.gun}
              x={Math.floor(i / 7) * adim}
              y={14 + (i % 7) * adim}
              width={hucre}
              height={hucre}
              rx={1.5}
              fill={seviye < 0 ? 'var(--color-line)' : 'var(--color-accent)'}
              fillOpacity={seviye < 0 ? 1 : 0.25 + seviye * 0.19}
            />
          );
        })}
      </svg>
      <div
        className="text-muted flex items-center justify-end gap-1.5 text-[0.6875rem]"
        aria-hidden="true"
      >
        Az
        {[-1, 0, 1, 2, 3, 4].map((s) => (
          <span
            key={s}
            className="size-2.5 rounded-[2px]"
            style={{
              background: s < 0 ? 'var(--color-line)' : 'var(--color-accent)',
              opacity: s < 0 ? 1 : 0.25 + s * 0.19,
            }}
          />
        ))}
        Çok
      </div>
    </section>
  );
}
