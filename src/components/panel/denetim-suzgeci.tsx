'use client';

import { ArrowDownWideNarrow, ArrowUpNarrowWide, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { denetimYolu } from '@/components/panel/denetim-gorunumleri';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Tarih aralığı + sıralama yönü.
 *
 * Eylem sekmeleri `DurumSekmeleri` gibi `Link` (ayrı adresler, sunucu süzüyor);
 * tarih aralığı ise GÖNDERİMDE adrese yazılıyor — her tuşta gezinmek istemiyoruz.
 * T-041f'teki mesaj aramasıyla aynı ayrım.
 *
 * ⚠️ `to` DAHİL: Backend o günün son anına kadar süzüyor. Arayüz bunu söylüyor,
 * çünkü "bitiş dahil mi" sorusu kullanıcıya bırakıldığında yanlış tahmin
 * edilebilecek bir şey ve sonucu sessizce eksik liste olur.
 */
export function DenetimSuzgeci({
  eylem,
  from,
  to,
  sort,
}: {
  eylem: string;
  from: string;
  to: string;
  sort: 'asc' | 'desc';
}) {
  const router = useRouter();
  const [bas, setBas] = useState(from);
  const [bit, setBit] = useState(to);

  /* Adres dışarıdan değişince (geri tuşu, sekme) girdiler onu takip etsin. */
  useEffect(() => {
    setBas(from);
    setBit(to);
  }, [from, to]);

  const uygula = (yeniBas: string, yeniBit: string) => {
    router.push(denetimYolu({ eylem, sort, from: yeniBas || undefined, to: yeniBit || undefined }));
  };

  const aralikVar = Boolean(from || to);

  return (
    <form
      onSubmit={(olay) => {
        olay.preventDefault();
        uygula(bas, bit);
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="denetim-from">Başlangıç</Label>
        <Input
          id="denetim-from"
          type="date"
          value={bas}
          onChange={(olay) => setBas(olay.target.value)}
          className="tabular"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="denetim-to">Bitiş (dahil)</Label>
        <Input
          id="denetim-to"
          type="date"
          value={bit}
          onChange={(olay) => setBit(olay.target.value)}
          className="tabular"
        />
      </div>

      <Button type="submit" variant="secondary" size="sm">
        Uygula
      </Button>

      {aralikVar && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setBas('');
            setBit('');
            uygula('', '');
          }}
        >
          <X className="size-4" aria-hidden="true" />
          Aralığı temizle
        </Button>
      )}

      {/*
        SIRALAMA SUNUCUDA, tabloda değil: liste SAYFALANMIŞ, yani istemcide
        sıralamak yalnızca o sayfanın satırlarını karıştırır ve yanlış cevap
        verir. `VeriTablosu`nun istemci sıralaması diğer sütunlarda duruyor ama
        tarih için doğru olan bu düğme.
      */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto"
        onClick={() =>
          router.push(
            denetimYolu({
              eylem,
              from: from || undefined,
              to: to || undefined,
              sort: sort === 'desc' ? 'asc' : 'desc',
            }),
          )
        }
      >
        {sort === 'desc' ? (
          <ArrowDownWideNarrow className="size-4" aria-hidden="true" />
        ) : (
          <ArrowUpNarrowWide className="size-4" aria-hidden="true" />
        )}
        {sort === 'desc' ? 'En yeni önce' : 'En eski önce'}
      </Button>
    </form>
  );
}
