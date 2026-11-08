'use client';

import { KeyRound, Loader2, ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { QrCode } from '@/components/auth/qr-code';
import {
  resolveTotpErrorMessage,
  type TotpActions,
  type TotpStatus,
} from '@/components/auth/totp-contract';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { FormAlert, FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { totpCodeSchema } from '@/lib/schemas';
import { cn } from '@/lib/utils/cn';

/**
 * Akış adımları.
 *
 *   overview → scan → verify → codes → overview
 *
 * `codes` adımı, kurtarma kodlarının kullanıcıya gösterildiği TEK andır.
 * Kullanıcı kaydettiğini onaylamadan bu adımdan çıkılamaz; çıkıldığında kodlar
 * state'ten silinir ve bir daha getirilemez (sunucuda hash'li duruyorlar).
 */
type Step = 'overview' | 'scan' | 'verify' | 'codes';

export type TotpSetupProps = {
  status: TotpStatus;
  actions: TotpActions;
  /** Authenticator uygulamasında görünecek hesap etiketi (genelde e-posta). */
  accountLabel: string;
};

export function TotpSetup({ status, actions, accountLabel }: TotpSetupProps) {
  const router = useRouter();
  const { update } = useSession();

  const [step, setStep] = useState<Step>('overview');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [remaining, setRemaining] = useState(status.remainingBackupCodes);
  const [enabled, setEnabled] = useState(status.enabled);
  /** Yenileme akışında mıyız — kod ekranındaki metin buna göre değişir. */
  const [isRegenerating, setIsRegenerating] = useState(false);
  /**
   * Jeton tazeleme başarısız oldu mu. `true` ise 2FA veritabanında AÇIK ama
   * eldeki jeton hâlâ eski durumu taşıyor; kullanıcı §8.1 kapısına takılacak.
   * Sessizce takılmasın diye ne yapması gerektiği açıkça söyleniyor.
   */
  const [refreshFailed, setRefreshFailed] = useState(false);

  const codeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (step === 'verify') {
      codeInputRef.current?.focus();
    }
  }, [step]);

  async function handleStart() {
    setPending(true);
    setFormError(null);
    setRefreshFailed(false);

    const result = await actions.startTotpSetup();
    setPending(false);

    if (!result.ok) {
      setFormError(resolveTotpErrorMessage(result.error));
      return;
    }

    setSecret(result.data.secret);
    setOtpauthUri(result.data.otpauthUri);
    setStep('scan');
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setCodeError(null);

    const trimmed = code.trim();
    // Kurulum doğrulaması YALNIZCA TOTP kabul eder — kurtarma kodu bu adımda
    // anlamsız, henüz üretilmemiş olur.
    const parsed = totpCodeSchema.safeParse(trimmed);
    if (!parsed.success) {
      setCodeError(parsed.error.issues[0]?.message ?? 'Doğrulama kodu 6 haneli olmalıdır.');
      return;
    }

    setPending(true);
    const result = isRegenerating
      ? await actions.regenerateBackupCodes!(parsed.data)
      : await actions.confirmTotpSetup(parsed.data);

    if (!result.ok) {
      setPending(false);
      setFormError(resolveTotpErrorMessage(result.error));
      setCode('');
      codeInputRef.current?.focus();
      return;
    }

    // SIRA ÖNEMLİ: kurtarma kodları ÖNCE ekrana yazılır.
    // Jeton tazeleme başarısız olsa bile kullanıcı kodlarını görmeli — kodlar
    // sunucuda argon2id ile hash'li ve bir daha getirilemiyor.
    setBackupCodes(result.data.backupCodes);
    setRemaining(result.data.remainingBackupCodes);
    setEnabled(true);
    setCode('');
    setSecret(null);
    setOtpauthUri(null);
    setSavedConfirmed(false);
    setStep('codes');

    /**
     * §8.1 kapısı JETONdaki `tfa` alanına bakıyor. `confirmTotpSetup` veritabanını
     * güncelledi ama eldeki jeton hâlâ `tfa: false` diyor; tazelenmezse kullanıcı
     * kurulumu bitirir ve panele giremez — her istek onu buraya geri atar.
     *
     * BOŞ NESNE ZORUNLUDUR, `update()` DEĞİL.
     *
     * `next-auth/react`'in kaynağında (beta.32, react.js:336):
     *     typeof data === 'undefined' ? undefined : { body: { csrfToken, data } }
     * Yani ARGÜMANSIZ çağrı yalnızca GET ile oturumu yeniden okur; sunucuya POST
     * gitmez, `jwt` callback'i `trigger: 'update'` ile ÇALIŞMAZ ve `Set-Cookie`
     * dönmez. Jeton `tfa: false` kalır, kullanıcı §8.1 kapısına takılır.
     * ÖLÇÜLDÜ: argümansız çağrıda jeton `{tfa:false}`, `update({})` ile `{tfa:true}`.
     *
     * Gövdenin İÇERİĞİ önemsiz: sunucu onu yok sayıp değeri veritabanından okuyor
     * (T-013e). Bu yüzden boş nesne gönderiliyor — istemci hiçbir şey İDDİA ETMİYOR,
     * yalnızca "sunucudan tazele" diyor. `update({ tfa: true })` göndermek zaten
     * kapıyı açmazdı ve yanlış bir izlenim bırakırdı.
     *
     * YENİLEMEDE ÇAĞRILMAZ: 2FA zaten açık, jeton zaten `tfa: true` taşıyor.
     * Ölçüldü (T-036c raporu / Testler) — varsayılmadı.
     */
    if (!isRegenerating) {
      // `loading` sırasında `undefined`, hata hâlinde `null` dönebiliyor;
      // ikisi de "tazelenemedi" demek.
      const refreshed = await update({}).catch(() => null);
      setRefreshFailed(!refreshed);
    }

    setPending(false);
  }

  function finishCodes() {
    // Kodları bellekten düşür — "yalnızca bir kez gösterilir" kuralının
    // arayüz tarafındaki karşılığı budur.
    setBackupCodes(null);
    setSavedConfirmed(false);

    const ilkKurulumdu = !isRegenerating;
    setIsRegenerating(false);
    setStep('overview');

    // Kurulum bittiyse ve jeton tazelendiyse kullanıcının gitmek istediği yer
    // panelin kendisiydi; §8.1 kapısı onu buraya zorlamıştı.
    if (ilkKurulumdu && !refreshFailed) {
      router.push('/panel');
      router.refresh();
    }
  }

  function downloadCodes(codes: string[]) {
    const content = [
      'Samet Şahin Panel — kurtarma kodları',
      `Hesap: ${accountLabel}`,
      '',
      'Her kod YALNIZCA BİR KEZ kullanılabilir.',
      'Bu dosyayı güvenli bir yerde sakla; kodlar bir daha gösterilmeyecek.',
      '',
      ...codes,
      '',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kurtarma-kodlari.txt';
    link.click();
    // Blob URL'i hemen serbest bırak — sekme ömrü boyunca erişilebilir kalmasın.
    URL.revokeObjectURL(url);
  }

  // ---------------------------------------------------------------- overview
  if (step === 'overview') {
    return (
      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <CardTitle>İki adımlı doğrulama</CardTitle>
              <CardDescription>
                Şifreni bilen birinin panele girmesini engeller. Girişte telefonundaki uygulamadan 6
                haneli kod istenir.
              </CardDescription>
            </div>

            <Badge variant={enabled ? 'success' : 'warning'}>{enabled ? 'Açık' : 'Kapalı'}</Badge>
          </div>

          {formError && <FormAlert>{formError}</FormAlert>}

          {refreshFailed && (
            <FormAlert>
              İki adımlı doğrulama açıldı ama oturumun tazelenemedi; panele girmeye çalışırsan bu
              ekrana geri dönersin. Çıkış yapıp yeniden giriş yapman yeterli.
            </FormAlert>
          )}

          {enabled ? (
            <div className="flex flex-col gap-4">
              <div className="border-line bg-elevated/60 rounded-input flex items-center gap-3 border p-3">
                <ShieldCheck className="text-success size-5 shrink-0" aria-hidden="true" />
                <p className="text-body text-sm">
                  Kalan kurtarma kodu:{' '}
                  <span className="tabular text-primary font-medium">{remaining}</span> / 10
                </p>
              </div>

              {remaining <= 2 && (
                <FormAlert>
                  Kurtarma kodların bitmek üzere. Telefonuna erişimini kaybedersen panele giremezsin
                  — yeni kod üret.
                </FormAlert>
              )}

              {actions.regenerateBackupCodes && (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsRegenerating(true);
                      setFormError(null);
                      setCode('');
                      setStep('verify');
                    }}
                    className="self-start"
                  >
                    <KeyRound className="size-4" aria-hidden="true" />
                    Kurtarma kodlarını yenile
                  </Button>
                  <p className="text-muted text-xs">
                    Yeni kod üretilince eski kodların tamamı geçersiz olur.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="border-warning/40 bg-warning/8 rounded-input flex items-start gap-3 border p-3">
                <ShieldAlert className="text-warning mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <p className="text-body text-sm">
                  Panelde muhasebe ve sağlık verisi tutuluyor. İki adımlı doğrulama açık değilken
                  tek koruma şifren.
                </p>
              </div>

              <Button onClick={handleStart} disabled={pending} className="self-start">
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {pending ? 'Hazırlanıyor…' : 'İki adımlı doğrulamayı aç'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // -------------------------------------------------------------------- scan
  if (step === 'scan' && otpauthUri && secret) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <CardTitle>1. Uygulamana ekle</CardTitle>
            <CardDescription>
              Google Authenticator, 1Password, Bitwarden ya da benzeri bir uygulamayla QR kodunu
              okut.
            </CardDescription>
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="bg-elevated rounded-card border-line shrink-0 border p-3">
              <QrCode value={otpauthUri} label="İki adımlı doğrulama kurulum karekodu" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Label htmlFor="totp-secret">QR okutamıyorsan bu anahtarı elle gir</Label>
              <Input
                id="totp-secret"
                readOnly
                value={secret}
                onFocus={(event) => event.currentTarget.select()}
                className="tabular"
              />
              <div className="flex flex-wrap gap-2">
                <CopyButton value={secret} label="Anahtarı kopyala" />
              </div>
              <p className="text-muted text-xs">Anahtar hesabına özeldir; kimseyle paylaşma.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setFormError(null);
                setStep('verify');
              }}
            >
              Devam et
            </Button>
            <Button variant="ghost" onClick={() => setStep('overview')}>
              Vazgeç
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ------------------------------------------------------------------ verify
  if (step === 'verify') {
    return (
      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <CardTitle>{isRegenerating ? 'Kimliğini doğrula' : '2. Kodu doğrula'}</CardTitle>
            <CardDescription>
              {isRegenerating
                ? 'Yeni kurtarma kodu üretmek için uygulamandaki güncel kodu gir.'
                : 'Uygulamanda görünen 6 haneli kodu gir. Doğrulanmadan iki adımlı doğrulama açılmaz.'}
            </CardDescription>
          </div>

          {formError && <FormAlert>{formError}</FormAlert>}

          {/*
            method="post" — T-017/K5 dersi: hidrasyon tamamlanmadan Enter'a
            basılırsa tarayıcı yerel GET yapar ve kod adres çubuğuna düşerdi.
          */}
          <form method="post" onSubmit={handleVerify} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="totp-code" required>
                Doğrulama kodu
              </Label>
              <Input
                id="totp-code"
                ref={codeInputRef}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={6}
                placeholder="123456"
                aria-invalid={codeError ? true : undefined}
                aria-describedby={codeError ? 'totp-code-hata' : undefined}
                className="tabular max-w-40"
              />
              {codeError && <FormError id="totp-code-hata">{codeError}</FormError>}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {pending ? 'Doğrulanıyor…' : 'Doğrula'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCode('');
                  setCodeError(null);
                  setFormError(null);
                  setStep(isRegenerating ? 'overview' : 'scan');
                  setIsRegenerating(false);
                }}
              >
                Geri
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // ------------------------------------------------------------------- codes
  if (step === 'codes' && backupCodes) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <CardTitle>
              {isRegenerating ? 'Yeni kurtarma kodların' : '3. Kurtarma kodların'}
            </CardTitle>
            <CardDescription>
              Telefonuna erişemediğinde bu kodlarla giriş yaparsın. Her kod bir kez kullanılır.
            </CardDescription>
          </div>

          <div
            role="alert"
            className="border-warning/40 bg-warning/8 rounded-input flex items-start gap-3 border p-3"
          >
            <TriangleAlert className="text-warning mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p className="text-body text-sm">
              <strong className="text-primary font-semibold">
                Bu kodlar bir daha gösterilmeyecek.
              </strong>{' '}
              Sunucuda yalnızca şifrelenmiş hâlleri saklanıyor. Şimdi kopyala ya da indir.
            </p>
          </div>

          <ul className="border-line bg-elevated/60 rounded-input grid grid-cols-1 gap-x-6 gap-y-1.5 border p-4 sm:grid-cols-2">
            {backupCodes.map((backupCode) => (
              <li key={backupCode} className="tabular text-primary text-sm">
                {backupCode}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <CopyButton value={backupCodes.join('\n')} label="Kodları kopyala" />
            <Button variant="secondary" size="sm" onClick={() => downloadCodes(backupCodes)}>
              İndir (.txt)
            </Button>
          </div>

          <label
            className={cn(
              'border-line rounded-input flex cursor-pointer items-start gap-3 border p-3',
              'hover:border-line-hover ease-brand duration-micro transition-colors',
            )}
          >
            <input
              type="checkbox"
              checked={savedConfirmed}
              onChange={(event) => setSavedConfirmed(event.target.checked)}
              className="focus-ring accent-accent mt-0.5 size-4 shrink-0"
            />
            <span className="text-body text-sm">Kodları güvenli bir yere kaydettim.</span>
          </label>

          {refreshFailed && (
            <FormAlert>
              Kurulum tamamlandı ama oturumun tazelenemedi. Kodlarını kaydettikten sonra çıkış yapıp
              yeniden giriş yap — panele o zaman girebilirsin.
            </FormAlert>
          )}

          <Button onClick={finishCodes} disabled={!savedConfirmed} className="self-start">
            {refreshFailed ? 'Kodları kaydettim' : 'Bitir'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Beklenmedik durum (örn. `scan` adımına secret olmadan düşülmesi) — akışı
  // sessizce kilitlemek yerine başa dön.
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <CardTitle>Bir şeyler ters gitti</CardTitle>
        <CardDescription>Kurulum akışı yarıda kaldı. Baştan başlayabilirsin.</CardDescription>
        <Button variant="secondary" onClick={() => setStep('overview')} className="self-start">
          Başa dön
        </Button>
      </CardContent>
    </Card>
  );
}
