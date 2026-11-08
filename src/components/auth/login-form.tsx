'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { resolveAuthErrorMessage } from '@/components/auth/auth-errors';
import { PasskeyGiris } from '@/components/auth/passkey-giris';
import { Button } from '@/components/ui/button';
import { FormAlert, FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginCodeSchema, loginSchema } from '@/lib/schemas';

/**
 * Form şeması. E-posta ve şifre kuralları doğrudan `loginSchema`'dan gelir.
 *
 * `totpCode` şema düzeyinde OPSİYONELDİR (1. adımda alan yok). 2. adımda
 * zorunluluğu `onSubmit` uygular — tek şemayla iki adımı yönetmenin en az
 * dolaylı yolu bu.
 */
const loginFormSchema = loginSchema.omit({ totpCode: true }).extend({
  totpCode: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || loginCodeSchema.safeParse(value).success, {
      error: '6 haneli doğrulama kodunu ya da kurtarma kodunu gir.',
    }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

type Step = 'credentials' | 'totp';

export type LoginFormProps = {
  /** Başarılı girişte gidilecek yol. Sunucuda doğrulanmış olmalı (açık yönlendirme). */
  callbackUrl: string;
  /**
   * Auth.js `pages.error` de `/giris`'e bakıyor; tarayıcı buraya `?code=...` ile
   * dönebilir. O durumda hata ilk render'da gösterilir.
   */
  initialErrorCode?: string;
};

export function LoginForm({ callbackUrl, initialErrorCode }: LoginFormProps) {
  const router = useRouter();

  const [step, setStep] = useState<Step>('credentials');
  const [formError, setFormError] = useState<string | null>(() =>
    resolveAuthErrorMessage(initialErrorCode),
  );
  /**
   * Kurtarma kodu girişi. Yalnızca klavye İPUCUNU değiştirir (numeric → text);
   * alan, gönderim ve doğrulama aynı kalır — ADR-013 "ayrı form olmasın" diyor.
   * Gerekçe: iOS sayısal tuş takımında harf yok; bu anahtar olmadan telefonunu
   * kaybetmiş bir kullanıcı mobilde kurtarma kodunu FİZİKSEL OLARAK giremiyor.
   */
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '', totpCode: '' },
  });

  // 2. adıma geçince odak kod alanına gitsin — kullanıcı Tab'lamak zorunda kalmasın.
  useEffect(() => {
    if (step === 'totp') {
      setFocus('totpCode');
    }
  }, [step, setFocus]);

  const isTotpStep = step === 'totp';

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);

    const code = values.totpCode?.trim();

    if (isTotpStep && !code) {
      setError('totpCode', { message: 'Doğrulama kodunu gir.' });
      return;
    }

    // T-013b sözleşmesi: her iki adım da AYNI uca gider; ikinci adımda yalnızca
    // `totpCode` eklenir. Bu yüzden e-posta ve şifre formda tutuluyor.
    const result = await signIn('credentials', {
      email: values.email,
      password: values.password,
      ...(code ? { totpCode: code } : {}),
      redirect: false,
    });

    // `result.ok` HTTP durumunu yansıtır ve kimlik doğrulama başarısız olsa da
    // true olabilir. Tek güvenilir başarı ölçütü `error`'ın boş olmasıdır.
    if (result && !result.error) {
      router.replace(callbackUrl);
      router.refresh();
      return;
    }

    const errorCode = result?.code;

    if (errorCode === 'TOTP_REQUIRED') {
      // Hata değil, adım sinyali. `reset()` ÇAĞRILMAZ — e-posta ve şifre kalır.
      setStep('totp');
      return;
    }

    if (errorCode === 'INVALID_TOTP') {
      setValue('totpCode', '');
    }

    setFormError(resolveAuthErrorMessage(errorCode));
  }

  return (
    /*
     * `method="post"` görünüşte gereksiz — gönderimi JavaScript yapıyor. Ama
     * hidrasyon tamamlanmadan Enter'a basılırsa tarayıcı YEREL gönderim yapar
     * ve varsayılan yöntem GET'tir: şifre `?password=...` olarak adres çubuğuna,
     * tarayıcı geçmişine ve sunucu erişim kayıtlarına düşer. Playwright ile
     * bu sızıntı bizzat gözlendi (T-017 raporu / KARAR K5).
     */
    <form
      method="post"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      {!isTotpStep && <PasskeyGiris callbackUrl={callbackUrl} hata={setFormError} />}

      {formError && <FormAlert>{formError}</FormAlert>}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" required>
          E-posta
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          readOnly={isTotpStep}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? 'email-hata' : undefined}
          className={isTotpStep ? 'text-muted' : undefined}
          {...register('email')}
        />
        {errors.email && <FormError id="email-hata">{errors.email.message}</FormError>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" required>
          Şifre
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          readOnly={isTotpStep}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? 'password-hata' : undefined}
          className={isTotpStep ? 'text-muted' : undefined}
          {...register('password')}
        />
        {errors.password && <FormError id="password-hata">{errors.password.message}</FormError>}
      </div>

      {isTotpStep && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="totpCode" required>
            Doğrulama kodu
          </Label>
          <Input
            id="totpCode"
            /* Harf de kabul edilir — kurtarma kodu bu alandan gelir (ADR-013). */
            inputMode={useRecoveryCode ? 'text' : 'numeric'}
            autoComplete="one-time-code"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={64}
            placeholder={useRecoveryCode ? 'ABCDE-FGHIJ' : '123456'}
            aria-invalid={errors.totpCode ? true : undefined}
            aria-describedby={`totpCode-yardim${errors.totpCode ? ' totpCode-hata' : ''}`}
            className="tabular"
            {...register('totpCode')}
          />
          <p id="totpCode-yardim" className="text-muted text-xs">
            Uygulamandaki 6 haneli kodu gir. Telefonuna erişemiyorsan kurtarma kodunu da aynı alana
            yazabilirsin.
          </p>
          {errors.totpCode && <FormError id="totpCode-hata">{errors.totpCode.message}</FormError>}

          <button
            type="button"
            onClick={() => setUseRecoveryCode((previous) => !previous)}
            className="focus-ring rounded-btn text-accent-soft self-start text-xs underline underline-offset-2"
          >
            {useRecoveryCode ? 'Doğrulama kodu gireceğim' : 'Kurtarma kodu gireceğim'}
          </button>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {isSubmitting
          ? isTotpStep
            ? 'Doğrulanıyor…'
            : 'Giriş yapılıyor…'
          : isTotpStep
            ? 'Doğrula ve gir'
            : 'Giriş yap'}
      </Button>

      {isTotpStep && (
        <button
          type="button"
          onClick={() => {
            setStep('credentials');
            setValue('totpCode', '');
            setUseRecoveryCode(false);
            setFormError(null);
          }}
          className="focus-ring rounded-btn text-muted hover:text-primary text-sm"
        >
          E-posta veya şifreyi değiştir
        </button>
      )}

      {/* Adım değişimi ekran okuyucuya duyurulur — görsel değişiklik tek başına yetmez. */}
      <span aria-live="polite" className="sr-only">
        {isTotpStep ? 'İki adımlı doğrulama gerekiyor. Doğrulama kodunu gir.' : ''}
      </span>
    </form>
  );
}
