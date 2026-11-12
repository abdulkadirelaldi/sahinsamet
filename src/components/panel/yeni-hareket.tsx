'use client';

import { Plus } from 'lucide-react';
import { useState, useTransition, type KeyboardEvent } from 'react';

import { EKIPMAN, KAS_GRUBU, secenekler } from '@/components/panel/kisisel-etiketler';
import { cn } from '@/lib/utils/cn';
import { hizliEgzersizEkleAction } from '@/server/actions/exercise';
import type { Equipment, MuscleGroup } from '@/types';

/**
 * "LİSTEDE YOK MU? YENİ HAREKET" (2026-11-12) — program günü, canlı antrenman ve set formundaki
 * hareket seçicilerinin altında. Sahibi bir hareketi eklemek için önce kütüphaneye gidip geri
 * dönmek zorundaydı; canlı antrenmanda bu, antrenmanı yarıda bırakmak demekti.
 *
 * Ad + kas grubu (+ ekipman) → `hizliEgzersizEkleAction`. Aynı adlı hareket varsa YENİSİ
 * açılmaz: o seçilir (arşivdeyse arşivden çıkarılır) — rekorlar bölünmesin.
 *
 * ⚠️ `<form>` DEĞİL: set formunun İÇİNDE de kullanılıyor ve iç içe form geçersiz HTML. Enter
 * tuşu elle yakalanıyor ki üstteki formu göndermesin.
 */

export interface EklenenHareket {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
}

const ALAN =
  'focus-ring rounded-input border-line-strong bg-elevated text-primary placeholder:text-muted h-11 w-full min-w-0 border px-3 text-sm';

const DURUM_METNI = {
  yeni: 'eklendi',
  mevcut: 'zaten vardı, seçildi',
  arsivden: 'arşivden çıkarıldı ve seçildi',
} as const;

export function YeniHareket({
  eklendi,
  varsayilanKas = 'CHEST',
}: {
  eklendi: (hareket: EklenenHareket) => void;
  varsayilanKas?: MuscleGroup;
}) {
  const [acik, setAcik] = useState(false);
  const [ad, setAd] = useState('');
  const [kas, setKas] = useState<MuscleGroup>(varsayilanKas);
  const [ekipman, setEkipman] = useState<Equipment>('OTHER');
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  const kaydet = () => {
    if (!ad.trim()) return setHata('Hareketin adını yaz.');
    setHata(null);
    basla(async () => {
      try {
        const sonuc = await hizliEgzersizEkleAction({
          name: ad,
          muscleGroup: kas,
          equipment: ekipman,
        });
        if (!sonuc.ok) {
          return setHata(Object.values(sonuc.error.fields ?? {})[0] ?? sonuc.error.message);
        }
        const { egzersiz, durum } = sonuc.data;
        eklendi({ id: egzersiz.id, name: egzersiz.name, muscleGroup: egzersiz.muscleGroup });
        setBilgi(`“${egzersiz.name}” ${DURUM_METNI[durum]}.`);
        setAd('');
        setAcik(false);
      } catch {
        setHata('Bağlantı kurulamadı. Yeniden dene.');
      }
    });
  };

  const enter = (o: KeyboardEvent<HTMLInputElement>) => {
    if (o.key !== 'Enter') return;
    o.preventDefault();
    kaydet();
  };

  if (!acik) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => {
            setAcik(true);
            setBilgi(null);
          }}
          className="focus-ring text-accent flex min-h-11 items-center gap-1.5 self-start rounded-full text-sm font-medium"
        >
          <Plus className="size-4" aria-hidden="true" />
          Listede yok mu? Yeni hareket ekle
        </button>
        {bilgi && (
          <p role="status" className="text-success text-sm">
            {bilgi}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Yeni hareket"
      className="border-line bg-elevated/40 rounded-card flex flex-col gap-3 border p-3"
    >
      <label className="text-muted flex flex-col gap-1 text-xs">
        Yeni hareketin adı
        <input
          value={ad}
          onChange={(o) => setAd(o.target.value)}
          onKeyDown={enter}
          maxLength={255}
          autoComplete="off"
          autoFocus
          placeholder="Ör. Incline Dumbbell Press"
          className={ALAN}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-muted flex min-w-0 flex-col gap-1 text-xs">
          Kas grubu
          <select
            value={kas}
            onChange={(o) => setKas(o.target.value as MuscleGroup)}
            className={ALAN}
          >
            {secenekler(KAS_GRUBU).map(([deger, etiket]) => (
              <option key={deger} value={deger}>
                {etiket}
              </option>
            ))}
          </select>
        </label>
        <label className="text-muted flex min-w-0 flex-col gap-1 text-xs">
          Ekipman
          <select
            value={ekipman}
            onChange={(o) => setEkipman(o.target.value as Equipment)}
            className={ALAN}
          >
            {secenekler(EKIPMAN).map(([deger, etiket]) => (
              <option key={deger} value={deger}>
                {etiket}
              </option>
            ))}
          </select>
        </label>
      </div>
      {hata && (
        <p role="alert" className="text-danger text-sm">
          {hata}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={bekliyor}
          onClick={kaydet}
          className={cn(
            'focus-ring bg-accent min-h-11 rounded-full px-4 text-sm font-semibold text-white disabled:opacity-60',
          )}
        >
          {bekliyor ? 'Ekleniyor…' : 'Hareketi oluştur ve seç'}
        </button>
        <button
          type="button"
          onClick={() => {
            setAcik(false);
            setHata(null);
          }}
          className="focus-ring text-body min-h-11 rounded-full px-4 text-sm"
        >
          Vazgeç
        </button>
      </div>
    </div>
  );
}
