'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button, buttonClasses } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-error';
import type { ApiResponse } from '@/types';

/**
 * KALICI SİLME ONAYI — F5'in gerçek silinen kayıtları için ortak desen.
 *
 * `deneyim-ekrani.tsx`teki yerel `SilDugmesi`nin genelleştirilmiş hâli; tek
 * fark ONAY METNİNİN çağırandan gelmesi. Sebebi ölçüt: F5'te denetim
 * kaydının ne TUTTUĞU varlığa göre değişiyor. Deneyimde "denetim kaydında
 * görünmeye devam eder" DOĞRU; sağlık ölçümünde ve günlükte YANLIŞ olurdu —
 * orada değer denetim kaydına hiç girmiyor (T-110/T-112), yalnızca gün kalıyor.
 * Sabit bir metin, kullanıcıya silinen verinin bir yerde durduğunu söyleyen
 * bir yalana dönüşürdü.
 *
 * Arşivlemeden (`ArsivleDugmesi`) AYRI bileşen ve ayrı dil: biri geri
 * alınabilir, öbürü alınamaz (ADR-017 ayrımı).
 */
export function KaliciSilDugmesi({
  kayitAdi,
  aciklama,
  sil,
  etiketGorunsun = false,
}: {
  /** Erişilebilir ad ve onay başlığı: "14 Ekim kaydı". */
  kayitAdi: string;
  /** Onayda gösterilecek sonuç cümlesi — neyin kalıp neyin gittiği. */
  aciklama: string;
  /** §7.2 zarfı döndüren çağrı. Fırlatırsa ağ hatası dalına düşer. */
  sil: () => Promise<ApiResponse<unknown>>;
  /** Düğmede "Sil" yazısı görünsün mü (detay ekranında evet, tablo satırında hayır). */
  etiketGorunsun?: boolean;
}) {
  const [onayda, setOnayda] = useState(false);
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const onayRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (onayda) onayRef.current?.focus();
  }, [onayda]);

  useEffect(() => {
    if (!onayda) return;
    const tusla = (o: KeyboardEvent) => o.key === 'Escape' && setOnayda(false);
    document.addEventListener('keydown', tusla);
    return () => document.removeEventListener('keydown', tusla);
  }, [onayda]);

  const onayla = async () => {
    setCalisiyor(true);
    setHata(null);
    try {
      const sonuc = await sil();
      if (sonuc.ok) setOnayda(false);
      else setHata(sonuc.error.message);
    } catch {
      setHata('Silinemedi — bağlantı kurulamadı. Kayıt olduğu gibi duruyor.');
    } finally {
      setCalisiyor(false);
    }
  };

  if (!onayda) {
    return (
      <div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOnayda(true)}>
          <Trash2 className="size-3.5" aria-hidden="true" />
          <span className={etiketGorunsun ? undefined : 'sr-only'}>
            {etiketGorunsun ? 'Sil' : `${kayitAdi} kaydını sil`}
          </span>
        </Button>
        {hata && <FormAlert className="mt-2">{hata}</FormAlert>}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={`${kayitAdi} silme onayı`}
      className="border-line bg-elevated rounded-card flex flex-col gap-2 border p-2 text-left"
    >
      <p className="text-body text-xs">
        <span className="text-primary font-medium">{kayitAdi}</span>{' '}
        <span className="text-primary font-medium">kalıcı olarak silinir</span>. {aciklama}
      </p>
      {hata && <FormAlert>{hata}</FormAlert>}
      <div className="flex gap-1.5">
        <button
          ref={onayRef}
          type="button"
          disabled={calisiyor}
          onClick={() => void onayla()}
          className={buttonClasses({ variant: 'danger', size: 'sm' })}
        >
          {calisiyor ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="size-3.5" aria-hidden="true" />
          )}
          {calisiyor ? 'Siliniyor…' : 'Evet, sil'}
        </button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOnayda(false)}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
