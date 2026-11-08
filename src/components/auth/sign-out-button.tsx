'use client';

import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * Çıkış düğmesi.
 *
 * NEDEN VAR (Güvenlik T3): §8.1 kapısı, 2FA kurmamış kullanıcıyı kurulum
 * ekranında tutuyor — panelin hiçbir yerine gidemiyor. Kurulum ZORUNLU olabilir
 * ama ekran HAPİS olmamalı; çıkışın tek yolu adres çubuğu olmamalı.
 *
 * VURGU BİLİNÇLİ OLARAK DÜŞÜK: `ghost` bile değil, düz metin. Kart'ın DIŞINDA
 * ve altında duruyor. Kurtarma kodları ekrandayken de erişilebilir kalıyor
 * (kullanıcı gerçekten çıkmak isteyebilir) ama görsel ağırlığı "Kopyala",
 * "İndir" ve "Bitir"in yanında kasıtlı olarak sönük — kimseyi kodlarını
 * kaydetmeden çıkmaya davet etmiyor.
 */
export function SignOutButton({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        // Çıkışta giriş ekranına dön; `callbackUrl` verilmezse Auth.js ana
        // sayfaya atar ve kullanıcı panele dönmek için tekrar gezinmek zorunda kalır.
        void signOut({ callbackUrl: '/giris' });
      }}
      className={cn(
        'focus-ring rounded-btn text-muted hover:text-primary ease-brand duration-micro',
        'inline-flex items-center gap-2 self-start px-1 py-1 text-sm transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      <LogOut className="size-4 shrink-0" aria-hidden="true" />
      {pending ? 'Çıkış yapılıyor…' : 'Çıkış yap'}
    </button>
  );
}
