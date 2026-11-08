'use client';

import { startRegistration } from '@simplewebauthn/browser';
import { Loader2, ScanFace, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  passkeyKaydetAction,
  passkeyKayitSecenekleriAction,
  passkeySilAction,
} from '@/server/actions/passkey';
import type { PasskeyDto } from '@/server/auth/passkey';

const TARIH = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Europe/Istanbul',
});

/** Cihaza önerilen ad — kullanıcı değiştirebilir. */
function cihazAdi(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Cihazım';
}

/**
 * FACE ID / PASSKEY YÖNETİMİ (2026-10-30) — Ayarlar → Güvenlik.
 * Eklenen cihazla bir sonraki girişte e-posta, şifre ve doğrulama kodu
 * gerekmez. Kaybolan cihazın passkey'i buradan silinir.
 */
export function PasskeyYonetimi({
  passkeyler,
  kodGerekli = false,
}: {
  passkeyler: PasskeyDto[];
  /** 2FA kuruluysa cihaz eklerken doğrulama kodu sorulur. */
  kodGerekli?: boolean;
}) {
  const router = useRouter();
  const [durum, setDurum] = useState<'bos' | 'ekleniyor'>('bos');
  const [mesaj, setMesaj] = useState<{ ton: 'ok' | 'hata'; metin: string } | null>(null);
  const [silinecek, setSilinecek] = useState<string | null>(null);
  const [kodSor, setKodSor] = useState(false);
  const [kod, setKod] = useState('');

  const ekle = async () => {
    setMesaj(null);
    if (kodGerekli && !kodSor) return setKodSor(true);
    setDurum('ekleniyor');
    try {
      const secenek = await passkeyKayitSecenekleriAction(kodGerekli ? { totpKodu: kod } : {});
      setKod('');
      if (!secenek.ok) {
        setMesaj({ ton: 'hata', metin: secenek.error.message });
        return;
      }
      const yanit = await startRegistration({ optionsJSON: secenek.data });
      const sonuc = await passkeyKaydetAction({ yanit, ad: cihazAdi() });
      if (sonuc.ok) {
        setMesaj({
          ton: 'ok',
          metin: `${sonuc.data.name} eklendi. Artık Face ID ile girebilirsin.`,
        });
        setKodSor(false);
        router.refresh();
      } else {
        setMesaj({ ton: 'hata', metin: sonuc.error.message });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'InvalidStateError') {
        setMesaj({ ton: 'hata', metin: 'Bu cihaz zaten ekli.' });
      } else if (!(error instanceof Error && error.name === 'NotAllowedError')) {
        setMesaj({ ton: 'hata', metin: 'Passkey eklenemedi. Yeniden dene.' });
      }
    } finally {
      setDurum('bos');
    }
  };

  const sil = async (id: string) => {
    if (silinecek !== id) {
      setSilinecek(id);
      return;
    }
    setSilinecek(null);
    const sonuc = await passkeySilAction({ id });
    if (sonuc.ok) router.refresh();
    else setMesaj({ ton: 'hata', metin: sonuc.error.message });
  };

  return (
    <section
      aria-labelledby="passkey-baslik"
      className="rounded-card border-line bg-surface flex flex-col gap-4 border p-5"
    >
      <div className="flex items-start gap-3">
        <span className="bg-accent/12 text-accent flex size-10 shrink-0 items-center justify-center rounded-xl">
          <ScanFace className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="passkey-baslik" className="text-primary text-base">
            Face ID ile giriş
          </h2>
          <p className="text-muted text-sm">
            Bu cihazı ekle; girişte e-posta, şifre ve doğrulama kodu gerekmez. Anahtar cihazından
            hiç çıkmaz.
          </p>
        </div>
      </div>

      {passkeyler.length > 0 && (
        <ul className="divide-line flex flex-col divide-y">
          {passkeyler.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="flex min-w-0 flex-col">
                <span className="text-primary truncate text-sm font-medium">{p.name}</span>
                <span className="text-muted text-xs">
                  Eklendi {TARIH.format(new Date(p.createdAt))}
                  {p.lastUsedAt && ` · son giriş ${TARIH.format(new Date(p.lastUsedAt))}`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => void sil(p.id)}
                className="focus-ring text-danger hover:bg-danger/8 flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {silinecek === p.id ? 'Emin misin?' : 'Kaldır'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {kodSor && (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-primary font-medium">Doğrulama uygulamasındaki kod</span>
          <input
            value={kod}
            onChange={(o) => setKod(o.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="focus-ring rounded-input border-line-strong bg-elevated text-primary tabular h-11 border px-3"
          />
          <span className="text-muted text-xs">
            Face ID şifreyi ve kodu atladığı için eklerken bir kez sorulur.
          </span>
        </label>
      )}

      <button
        type="button"
        onClick={() => void ekle()}
        disabled={durum === 'ekleniyor' || (kodSor && kod.trim().length < 6)}
        className="focus-ring rounded-btn bg-gradient-accent flex min-h-12 items-center justify-center gap-2 px-4 font-medium text-white active:opacity-80 disabled:opacity-60"
      >
        {durum === 'ekleniyor' ? (
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <ScanFace className="size-5" aria-hidden="true" />
        )}
        {passkeyler.length > 0 ? 'Başka cihaz ekle' : 'Bu cihazı ekle'}
      </button>

      <p role="status" className="text-sm">
        {mesaj && (
          <span className={mesaj.ton === 'ok' ? 'text-success' : 'text-danger'}>{mesaj.metin}</span>
        )}
      </p>
    </section>
  );
}
