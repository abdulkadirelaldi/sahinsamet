'use client';

import { Check, Minus, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { AliskanlikRozeti, aliskanlikRengi } from '@/components/panel/aliskanlik-rozeti';
import { SureBolumu } from '@/components/panel/sure-bolumu';
import {
  setHabitDayCountAction,
  setHabitDayStatusAction,
  sureEkleAction,
} from '@/server/actions/habit';
import type { GunDurumu, GunlukAliskanlikDto } from '@/server/services/habit-gun';
import { cn } from '@/lib/utils/cn';

/** Sayaç + açık işaret → durum. Sunucudaki `gunDurumu` ile aynı kural (iyimser güncelleme). */
function durumHesapla(count: number, missed: boolean, hedef: number | null): GunDurumu {
  if (missed) return 'YAPILMADI';
  if (count <= 0) return 'ISARETSIZ';
  return count >= (hedef ?? 1) ? 'YAPILDI' : 'EKSIK';
}

/**
 * HAYAT · GÜNLÜK LİSTE (2026-10-29) — telefonda her gün sırayla işaretlenen liste.
 *
 * Dokunuş ANINDA yansır (iyimser), sunucu yanıtı gelince kesinleşir; hata
 * olursa satır eski hâline döner ve hata satırın altında yazar. Sayfa sonra
 * `router.refresh()` ile özet kartını tazeler.
 *
 *   ✓  YAPTIM   — sayılı alışkanlıkta hedefe tamamlar; yeniden dokununca kaldırır
 *   ✗  YAPMADIM — açık işaret; yeniden dokununca kaldırır
 *   − / +       — yalnızca sayılı alışkanlıkta (ör. 7 bardak su)
 */
export function GunlukListe({
  gun,
  items,
  seriler = {},
  bugunMu = true,
}: {
  gun: string;
  items: GunlukAliskanlikDto[];
  /** Alışkanlık kimliği → süren seri metni ("12 gün"). */
  seriler?: Readonly<Record<string, string>>;
  /** Sayaç yalnızca bugün başlatılır; geçmiş güne süre elle eklenir. */
  bugunMu?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <Satir
          key={`${gun}-${item.id}`}
          gun={gun}
          item={item}
          seri={seriler[item.id]}
          bugunMu={bugunMu}
        />
      ))}
    </ul>
  );
}

function Satir({
  gun,
  item,
  seri,
  bugunMu,
}: {
  gun: string;
  item: GunlukAliskanlikDto;
  seri: string | undefined;
  bugunMu: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState(item.count);
  const [durum, setDurum] = useState<GunDurumu>(item.durum);
  const [baslangic, setBaslangic] = useState(item.sayacBaslangic);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();
  const [silmeOnayi, setSilmeOnayi] = useState<'yaptim' | 'yapmadim' | null>(null);
  const hedef = item.targetPerDay;
  const sayacAcik = bugunMu && baslangic !== null;

  // Sunucudan yeni veri gelince satır tazelenir: su kaydı alışkanlığı işaretlediğinde ya da
  // başka cihazda değiştiğinde eski değer kalmasın. Süren yazma varken dokunulmaz.
  const [sonVeri, setSonVeri] = useState(item);
  // Yazma sürerken gelen veri yazmadan önce üretilmiştir: atılır, yazmanın kendi tazelemesi gelir.
  if (item !== sonVeri) {
    setSonVeri(item);
    if (!bekliyor) {
      setCount(item.count);
      setDurum(item.durum);
      setBaslangic(item.sayacBaslangic);
    }
  }

  useEffect(() => {
    if (!silmeOnayi) return;
    const zaman = window.setTimeout(() => setSilmeOnayi(null), 5000);
    return () => window.clearTimeout(zaman);
  }, [silmeOnayi]);

  /** Süreli alışkanlıkta yazılı dakikayı silen dokunuş iki adımlı: emek tek dokunuşla gitmesin. */
  const onayla = (tur: 'yaptim' | 'yapmadim', silerMi: boolean, eylem: () => void) => {
    if (item.sureli && silerMi && silmeOnayi !== tur) return setSilmeOnayi(tur);
    setSilmeOnayi(null);
    eylem();
  };

  const uygula = (
    yeniCount: number,
    yeniMissed: boolean,
    eylem: () => Promise<{
      ok: boolean;
      data?: { count: number; missed: boolean };
      error?: { message: string };
    }>,
  ) => {
    const onceki = { count, durum };
    setCount(yeniCount);
    setDurum(durumHesapla(yeniCount, yeniMissed, hedef));
    setHata(null);
    basla(async () => {
      const geriDon = (mesaj: string) => {
        setCount(onceki.count);
        setDurum(onceki.durum);
        setHata(mesaj);
      };
      try {
        const sonuc = await eylem();
        if (!sonuc.ok) return geriDon(sonuc.error?.message ?? 'Kaydedilemedi.');
        // Sunucunun son sözü: üst sınıra takılan toplam ekranda da doğru görünsün.
        if (sonuc.data) {
          setCount(sonuc.data.count);
          setDurum(durumHesapla(sonuc.data.count, sonuc.data.missed, hedef));
        }
        router.refresh();
      } catch {
        geriDon('Bağlantı kurulamadı. Yeniden dene.');
      }
    });
  };

  const yaptim = () =>
    durum === 'YAPILDI'
      ? uygula(0, false, () =>
          setHabitDayStatusAction({ habitId: item.id, date: gun, durum: 'TEMIZLE' }),
        )
      : uygula(hedef ?? 1, false, () =>
          setHabitDayStatusAction({ habitId: item.id, date: gun, durum: 'YAPTIM' }),
        );

  const yapmadim = () =>
    durum === 'YAPILMADI'
      ? uygula(0, false, () =>
          setHabitDayStatusAction({ habitId: item.id, date: gun, durum: 'TEMIZLE' }),
        )
      : uygula(0, true, () =>
          setHabitDayStatusAction({ habitId: item.id, date: gun, durum: 'YAPMADIM' }),
        );

  const sayac = (fark: 1 | -1) => {
    const yeni = Math.max(0, Math.min(100, count + fark));
    if (yeni === count) return;
    uygula(yeni, false, () => setHabitDayCountAction({ habitId: item.id, date: gun, count: yeni }));
  };

  const ton = aliskanlikRengi(item.name, item.color);
  const fazla = item.sureli && hedef !== null ? count - hedef : 0;
  const durumMetni = sayacAcik
    ? 'Sayaç çalışıyor'
    : durum === 'YAPILDI'
      ? fazla > 0
        ? 'Hedefi aştın'
        : 'Tamamlandı'
      : durum === 'YAPILMADI'
        ? 'Yapılmadı'
        : durum === 'EKSIK'
          ? 'Devam ediyor'
          : null;

  return (
    <li
      className={cn(
        'rounded-card flex flex-col gap-3 border p-3.5 transition-colors',
        durum === 'YAPILDI' &&
          'border-success/25 bg-[color-mix(in_oklab,var(--success)_9%,var(--bg-surface))]',
        durum === 'YAPILMADI' &&
          'border-danger/25 bg-[color-mix(in_oklab,var(--danger)_7%,var(--bg-surface))]',
        durum !== 'YAPILDI' && durum !== 'YAPILMADI' && 'border-line bg-surface',
      )}
    >
      <div className="flex items-center gap-3">
        <AliskanlikRozeti ad={item.name} simge={item.icon} renk={item.color} />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-primary truncate font-medium">{item.name}</span>
          <span className="text-muted flex items-center gap-2 text-xs">
            {seri && (
              <span className="tabular text-warning font-medium">
                <span aria-hidden="true">🔥 </span>
                {seri}
              </span>
            )}
            {durumMetni && <span>{durumMetni}</span>}
            {item.hafta && (
              <span className="tabular">
                Bu hafta {item.hafta.tamam}/{item.hafta.hedef}
              </span>
            )}
            {!seri && !durumMetni && !item.hafta && <span>Bekliyor</span>}
          </span>
        </div>

        <Dugme
          etiket={`${item.name}: yapmadım`}
          aktif={durum === 'YAPILMADI'}
          ton="danger"
          kucuk
          onClick={() => onayla('yapmadim', count > 0, yapmadim)}
          disabled={bekliyor || sayacAcik}
        >
          <X className="size-4" />
        </Dugme>
        <Dugme
          etiket={`${item.name}: yaptım`}
          aktif={durum === 'YAPILDI'}
          ton="success"
          onClick={() => onayla('yaptim', durum === 'YAPILDI', yaptim)}
          disabled={bekliyor || sayacAcik}
        >
          <Check className="size-5" strokeWidth={2.5} />
        </Dugme>
      </div>

      {silmeOnayi && (
        <p role="status" className="text-warning text-xs">
          Yazılı süre silinecek. Onaylamak için yeniden dokun.
        </p>
      )}

      {item.sureli && hedef !== null && (
        <SureBolumu
          habitId={item.id}
          gun={gun}
          baslangic={baslangic}
          setBaslangic={setBaslangic}
          yenile={() => router.refresh()}
          hedef={hedef}
          count={count}
          renk={ton}
          bekliyor={bekliyor}
          bugunMu={bugunMu}
          ekle={(dk) =>
            uygula(count + dk, false, () =>
              sureEkleAction({ habitId: item.id, date: gun, dakika: dk }),
            )
          }
          duzelt={(toplam) =>
            uygula(toplam, false, () =>
              setHabitDayCountAction({ habitId: item.id, date: gun, count: toplam }),
            )
          }
          sayacSonucu={(yeni) => {
            setCount(yeni);
            setDurum(durumHesapla(yeni, false, hedef));
            router.refresh();
          }}
        />
      )}

      {!item.sureli && hedef !== null && (
        <div className="flex items-center gap-3">
          <Dugme
            etiket={`${item.name}: bir azalt`}
            kucuk
            onClick={() => sayac(-1)}
            disabled={bekliyor || count === 0}
          >
            <Minus className="size-4" />
          </Dugme>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="bg-elevated h-2 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${Math.min(100, (count / Math.max(1, hedef)) * 100)}%`,
                  backgroundColor: ton,
                }}
              />
            </div>
            <span className="tabular text-muted text-center text-xs">
              {count} / {hedef}
            </span>
          </div>
          <Dugme
            etiket={`${item.name}: bir artır`}
            kucuk
            onClick={() => sayac(1)}
            disabled={bekliyor}
          >
            <Plus className="size-4" />
          </Dugme>
        </div>
      )}

      {hata && (
        <p role="alert" className="text-danger text-xs">
          {hata}
        </p>
      )}
    </li>
  );
}

/** Ana düğme 44 px; `kucuk` 40 px, kenarsız. `aktif` iken dolu renk. */
function Dugme({
  etiket,
  aktif = false,
  ton,
  kucuk = false,
  onClick,
  disabled,
  children,
}: {
  etiket: string;
  aktif?: boolean;
  ton?: 'success' | 'danger';
  kucuk?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={etiket}
      aria-pressed={ton ? aktif : undefined}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'focus-ring flex shrink-0 items-center justify-center rounded-full border transition-[transform,background-color,color,border-color] active:scale-90 disabled:opacity-50',
        kucuk ? 'size-10' : 'size-11',
        ton === 'success' && 'isaret-tam',
        !aktif && kucuk && ton && 'text-muted hover:bg-elevated border-transparent',
        !aktif && kucuk && !ton && 'bg-elevated text-muted border-transparent',
        !aktif && !kucuk && 'border-accent/35 bg-accent/6 text-accent',
        aktif && ton === 'success' && 'text-white',
        aktif && ton === 'danger' && 'border-danger bg-danger text-white',
      )}
    >
      {children}
    </button>
  );
}
