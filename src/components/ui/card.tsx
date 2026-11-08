import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * §3.3 — kart: `bg-surface` + 1px kenar + yumuşak iç gölge, yarıçap 16px.
 * Kart zemininde gradient KULLANILMAZ (§3.1).
 *
 * `interactive`, kartın tamamı bir bağlantı/eylem olduğunda hover geri bildirimi verir.
 * Kartı tıklanabilir yaparken içine gerçek bir `<a>`/`<button>` koy — `onClick`'li
 * bir `div` klavyeyle erişilemez.
 */
export function Card({
  className,
  interactive = false,
  ...props
}: ComponentProps<'div'> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'surface-card',
        interactive &&
          'ease-brand duration-micro hover:border-line-hover hover:bg-elevated transition-colors',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 p-6 pb-0', className)} {...props} />;
}

/**
 * Kart başlığı.
 *
 * SEVİYE ÇAĞIRANIN İŞİ (`seviye`), varsayılan `h3`. Kart bir bölüm başlığının
 * (`h2`) altındaysa `h3` doğrudur; DOĞRUDAN sayfa `h1`inin altındaysa `h2`
 * verilmelidir — aksi hâlde başlık sırası atlıyor ve Lighthouse
 * `heading-order` düşüyor (T-032'de panelde ölçüldü: erişilebilirlik 98).
 *
 * Aynı ders T-024'te proje kartında da çıkmıştı: seviye içeriğin değil
 * KONUMUN işlevi, bu yüzden bileşende sabitlenemez.
 */
export function CardTitle({
  className,
  seviye: Baslik = 'h3',
  ...props
}: ComponentProps<'h3'> & { seviye?: 'h2' | 'h3' | 'h4' }) {
  return <Baslik className={cn('text-lg', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-muted text-sm', className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('border-line flex items-center gap-3 border-t p-6', className)} {...props} />
  );
}
