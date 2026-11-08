import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

/**
 * Ayarlar sayfasındaki tek bir bölüm.
 *
 * ÜÇ DURUM VAR ve ayrımları bilinçlidir (T-036/K5 disiplini):
 *   - `href`  → bölüm gerçekten çalışıyor, kart bir bağlantıdır
 *   - `eylem` → bölüm burada, satır içinde çalışıyor (örn. tema anahtarı)
 *   - ikisi de yoksa → HENÜZ YOK. Kart tıklanamaz, odak almaz ve "Yakında"
 *     rozeti taşır. Çalışıyormuş gibi görünüp hiçbir şey yapmayan bir bağlantı,
 *     olmayan bir bağlantıdan kötüdür — kullanıcı bunu ancak tıklayıp 404
 *     yiyince öğrenir.
 */
export function SettingsSection({
  icon: Icon,
  baslik,
  seviye: Baslik = 'h2',
  aciklama,
  href,
  eylem,
}: {
  icon: ComponentType<{ className?: string }>;
  baslik: string;
  /**
   * Başlık seviyesi. Varsayılan `h2`: bu bölümler doğrudan sayfa `h1`inin
   * altında duruyor. `h3` idi ve başlık sırasını atlatıyordu — T-032'de
   * ölçüldü (Lighthouse `heading-order`, erişilebilirlik 98).
   */
  seviye?: 'h2' | 'h3';
  aciklama: string;
  href?: string;
  eylem?: ReactNode;
}) {
  const hazir = Boolean(href) || Boolean(eylem);

  const govde = (
    <div className="flex flex-wrap items-start gap-4 p-5">
      <span
        aria-hidden="true"
        className={cn(
          'rounded-input flex size-10 shrink-0 items-center justify-center',
          hazir ? 'bg-elevated text-accent' : 'bg-elevated text-muted',
        )}
      >
        <Icon className="size-5" />
      </span>

      <div className="flex min-w-0 flex-[1_1_12rem] flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Baslik className="text-primary text-base font-semibold">{baslik}</Baslik>
          {!hazir && <Badge variant="neutral">Yakında</Badge>}
        </div>
        <p className="text-muted text-sm">{aciklama}</p>
      </div>

      {eylem ? (
        <div className="max-w-full">{eylem}</div>
      ) : href ? (
        <ChevronRight className="text-muted mt-2 size-5 shrink-0" aria-hidden="true" />
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Card interactive className="p-0">
        <Link href={href} className="focus-ring rounded-card block">
          {govde}
        </Link>
      </Card>
    );
  }

  return (
    <Card className={cn('p-0', !hazir && 'opacity-70')} aria-disabled={!hazir || undefined}>
      {govde}
    </Card>
  );
}
