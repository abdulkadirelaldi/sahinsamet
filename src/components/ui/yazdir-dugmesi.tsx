'use client';

import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * "Yazdır" düğmesi — /cv ve /panel/muhasebe/raporlar.
 *
 * ⚠️ T-108f'DE `components/public`TEN `components/ui`YA TAŞINDI. Rapor ekranı
 * da yazdırılabilir oldu ve panelden `components/public` altına bağımlılık
 * kurmak yön olarak yanlıştı; kopyalamak ise `window.print()` kısayolunu iki
 * yerde tutmak olurdu. Bileşen zaten genel: hiçbir sayfaya özel bilgi taşımaz.
 *
 * EN UÇTAKİ YAPRAK: `window.print()` için istemci gerekiyor, kullandığı
 * sayfaların geri kalanı için gerekmiyor.
 *
 * `data-yazdirmada-gizle` KENDİ ÜSTÜNDE: çıktının içinde "Yazdır" yazan bir
 * düğme görünmesi anlamsız olurdu. Düğme kaybolsa bile sayfa yazdırılabilir —
 * tarayıcının kendi yazdırma komutu her zaman çalışır; bu yalnızca kısayol.
 */
export function YazdirDugmesi({ etiket = 'Yazdır' }: { etiket?: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      data-yazdirmada-gizle
      onClick={() => window.print()}
    >
      <Printer className="size-4" aria-hidden="true" />
      {etiket}
    </Button>
  );
}
