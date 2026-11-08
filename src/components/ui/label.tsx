import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * Form etiketi. `htmlFor` ZORUNLUDUR — etiketsiz input ekran okuyucuda adsız kalır
 * ve etikete tıklayınca alan odaklanmaz.
 *
 * `required` yalnızca görsel yıldız basar; asıl doğrulama Zod şemasından gelir (§7.3).
 */
export function Label({
  className,
  htmlFor,
  required = false,
  children,
  ...props
}: Omit<ComponentProps<'label'>, 'htmlFor'> & { htmlFor: string; required?: boolean }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('text-primary text-sm leading-normal font-medium', className)}
      {...props}
    >
      {children}
      {required && (
        <span className="text-danger ml-0.5" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
