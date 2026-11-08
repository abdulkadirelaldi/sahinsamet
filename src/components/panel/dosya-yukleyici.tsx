'use client';

import { Loader2, Upload } from 'lucide-react';
import { useId, useRef, useState } from 'react';

import { FormAlert } from '@/components/ui/form-error';
import { cn } from '@/lib/utils/cn';
import type { AttachmentDto } from '@/server/services/attachment';
import type { ApiResponse, AttachmentEntity } from '@/types';

/**
 * DOSYA YÜKLEYİCİ — ADR-044, T-037f. Panelin TEK yükleme bileşeni.
 *
 * `POST /api/v1/panel/eklenti`e çok parçalı form gönderir; tarayıcı R2'ye hiç
 * gitmez. Yüklenen dosyanın `AttachmentDto`sunu çağırana verir — onu bir
 * kayda BAĞLAMAK (kapak, avatar, CV) çağıranın işi, çünkü bağlamak o kaydın
 * kendi formunun kaydıyla birlikte olmalı.
 *
 * ERİŞİLEBİLİRLİK: gerçek `<input type="file">` — klavye ve ekran okuyucu
 * yerel davranışı alır. Görsel düğme bir `<label>`; girdinin kendisi görsel
 * olarak gizli ama odaklanabilir (`sr-only`, `display:none` DEĞİL — o odak
 * sırasından düşürürdü). Durum `role="status"`, hata `FormAlert`.
 *
 * İSTEMCİ ÖN KONTROLÜ YALNIZCA KOLAYLIK: boyut ve uzantı burada da bakılıyor
 * ki 30 MB'lık bir dosya ağa çıkmadan söylensin; KARAR sunucuda, baytlarda
 * (`storeAttachment`). `accept` bir öneri, güvenlik değil.
 */

const ISTEMCI_UST_SINIR = 10 * 1024 * 1024;

const KABUL: Record<'gorsel' | 'pdf', { accept: string; aciklama: string }> = {
  gorsel: {
    accept: 'image/jpeg,image/png,image/webp,image/avif',
    aciklama: 'JPEG, PNG, WebP, AVIF',
  },
  pdf: { accept: 'application/pdf', aciklama: 'PDF' },
};

export function DosyaYukleyici({
  entity,
  entityId,
  tur,
  etiket,
  onYuklendi,
  order = 0,
}: {
  entity: AttachmentEntity;
  entityId: string;
  tur: 'gorsel' | 'pdf';
  /** Düğme metni: "Kapak yükle", "CV yükle"… */
  etiket: string;
  onYuklendi: (dosya: AttachmentDto) => void;
  order?: number;
}) {
  const kimlik = useId();
  const girdi = useRef<HTMLInputElement>(null);
  const [durum, setDurum] = useState<'bos' | 'yukleniyor' | 'tamam'>('bos');
  const [hata, setHata] = useState<string | null>(null);

  const yukle = async (dosya: File) => {
    setHata(null);
    if (dosya.size > ISTEMCI_UST_SINIR) {
      setHata('Dosya en fazla 10 MB olabilir.');
      return;
    }

    const form = new FormData();
    form.set('dosya', dosya);
    form.set('entity', entity);
    form.set('entityId', entityId);
    form.set('order', String(order));

    setDurum('yukleniyor');
    try {
      const yanit = await fetch('/api/v1/panel/eklenti', { method: 'POST', body: form });
      const sonuc = (await yanit.json()) as ApiResponse<AttachmentDto>;
      if (sonuc.ok) {
        setDurum('tamam');
        onYuklendi(sonuc.data);
      } else {
        setDurum('bos');
        setHata(sonuc.error.message);
      }
    } catch {
      setDurum('bos');
      setHata('Yüklenemedi — bağlantı kurulamadı. Tekrar deneyin.');
    } finally {
      // Aynı dosyayı yeniden seçmek de `change` üretsin.
      if (girdi.current) girdi.current.value = '';
    }
  };

  const yukleniyor = durum === 'yukleniyor';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={girdi}
          id={kimlik}
          type="file"
          accept={KABUL[tur].accept}
          className="peer sr-only"
          disabled={yukleniyor}
          aria-describedby={`${kimlik}-ipucu`}
          onChange={(olay) => {
            const dosya = olay.target.files?.[0];
            if (dosya) void yukle(dosya);
          }}
        />
        <label
          htmlFor={kimlik}
          className={cn(
            'border-line-strong bg-elevated text-primary rounded-btn ease-brand duration-micro inline-flex cursor-pointer items-center gap-2 border px-3 py-2 text-sm transition-colors',
            'hover:border-line-hover peer-focus-visible:ring-accent peer-focus-visible:ring-2',
            yukleniyor && 'cursor-wait opacity-70',
          )}
        >
          {yukleniyor ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="size-4" aria-hidden="true" />
          )}
          {yukleniyor ? 'Yükleniyor…' : etiket}
        </label>
        <span id={`${kimlik}-ipucu`} className="text-muted text-xs">
          {KABUL[tur].aciklama} · en fazla 10 MB
        </span>
      </div>

      {durum === 'tamam' && (
        <p role="status" className="text-success text-xs">
          Dosya yüklendi.
        </p>
      )}
      {hata && <FormAlert>{hata}</FormAlert>}
    </div>
  );
}
