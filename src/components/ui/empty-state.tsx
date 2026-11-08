import type { ComponentType, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * Boş / hata durumu ekranı.
 *
 * Kural: boş durum asla yalnızca "veri yok" demez — bir sonraki adımı önerir.
 * Bu yüzden `action` slot'u vardır ve `title` bir DURUM cümlesi, `description`
 * ise kullanıcıya ne yapabileceğini söyler.
 *
 *   <EmptyState
 *     icon={FolderOpen}
 *     title="Vitrin hazırlanıyor"
 *     description="İlk projeler çok yakında burada olacak. Bu arada nasıl çalıştığımı konuşalım."
 *     action={<Link href="/iletisim" className={buttonClasses()}>Bana yaz</Link>}
 *   />
 *
 * `tone="danger"` hata durumları için: metni değiştir, eylemi "Tekrar dene" yap.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'neutral',
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  /** Eylem daveti — buton veya bağlantı. Boş durumda güçlü biçimde önerilir. */
  action?: ReactNode;
  tone?: 'neutral' | 'danger';
  className?: string;
}) {
  const isDanger = tone === 'danger';

  return (
    <div
      role={isDanger ? 'alert' : undefined}
      className={cn(
        'rounded-card flex flex-col items-center justify-center gap-3 border border-dashed',
        'px-6 py-12 text-center',
        isDanger ? 'border-danger/40 bg-danger/5' : 'border-line bg-surface/50',
        className,
      )}
    >
      {Icon && (
        <span
          aria-hidden="true"
          className={cn(
            'rounded-pill flex size-12 items-center justify-center',
            isDanger ? 'bg-danger/10 text-danger' : 'bg-elevated text-muted',
          )}
        >
          <Icon className="size-6" />
        </span>
      )}

      <div className="flex flex-col gap-1.5">
        <p className="font-display text-primary text-lg font-semibold">{title}</p>
        <p className="text-muted mx-auto max-w-md text-sm text-balance">{description}</p>
      </div>

      {action && <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
