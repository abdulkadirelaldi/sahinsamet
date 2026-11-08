import {
  Bell,
  Bug,
  DatabaseBackup,
  Download,
  KeyRound,
  Palette,
  ScrollText,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import type { Metadata } from 'next';

import { SettingsSection } from '@/components/panel/settings-section';
import { Topbar } from '@/components/panel/topbar';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export const metadata: Metadata = {
  title: 'Ayarlar',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * §4.2 — `/panel/ayarlar`: şifre, 2FA, tema, yedek durumu, denetim kaydı.
 *
 * T-054f'te dördü çalışır hâle geldi (şifre, 2FA, tema, denetim kaydı); geriye
 * yalnızca yedek durumu kaldı ve o F6/T-066'ya bağlı. Ölü bağlantı yok —
 * sidebar'daki "Ayarlar" bağlantısının bir zamanlar 404 vermesi tam olarak bu
 * sınıf bir hataydı (T-036 / ENGEL-3).
 *
 * ⚠️ "YEDEK DURUMU" METNİ GELECEK ZAMANA ÇEKİLDİ (T-054f).
 *
 * Eski metin "Son gece yedeğinin zamanı, boyutu ve bütünlük doğrulaması."
 * diyordu — ŞİMDİKİ ZAMANDA, var olmayan bir özelliği anlatarak. Ölü düğme
 * değildi (T-018 ihlali yok) ama tutulamayacak söz sınıfına yakındı: okuyan,
 * bu bilgilerin bir yerde durduğunu sanır. Bölümü kaldırmak yerine metni
 * düzelttim; bölüm §4.2'de tanımlı ve kaldırmak onu envanterden düşürürdü.
 * Yeni metin olguyu söylüyor: yedekleme kurulmadı, kurulduğunda ne gösterecek.
 */
export default function AyarlarPage() {
  return (
    <>
      <Topbar title="Ayarlar" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <p className="text-muted max-w-2xl text-sm">
            Hesap güvenliği, görünüm ve sistem durumu. Bu sayfadaki her değişiklik denetim kaydına
            yazılır.
          </p>

          <div className="flex flex-col gap-3">
            <SettingsSection
              icon={KeyRound}
              baslik="Şifre"
              aciklama="Panel şifreni değiştir. Mevcut şifren sorulur, yeni şifre en az 12 karakter olmalıdır."
              href="/panel/ayarlar/sifre"
            />

            <SettingsSection
              icon={ShieldCheck}
              baslik="İki adımlı doğrulama"
              aciklama="Girişte telefonundaki uygulamadan kod iste. Kurtarma kodlarını buradan yönetirsin."
              href="/panel/ayarlar/guvenlik"
            />

            <SettingsSection
              icon={Bell}
              baslik="Bildirimler"
              aciklama="Ödeme günleri, kalan alışkanlıklar ve su hatırlatmaları telefonuna gelsin."
              href="/panel/ayarlar/bildirimler"
            />

            <SettingsSection
              icon={Smartphone}
              baslik="iPhone sağlık verisi"
              aciklama="Adım, uyku, nabız ve kilo Kısayollar ile her gün kendiliğinden gelsin."
              href="/panel/ayarlar/saglik-baglantisi"
            />

            <SettingsSection
              icon={Palette}
              baslik="Tema"
              aciklama="Koyu, aydınlık ya da sistem tercihini izle. Seçimin cookie'de tutulur ve tüm cihazlarda değil, bu tarayıcıda geçerlidir."
              eylem={<ThemeToggle />}
            />

            <SettingsSection
              icon={Download}
              baslik="Verini dışa aktar"
              aciklama="Cüzdan, sağlık ve alışkanlık kayıtların Excel'de açılan CSV olarak. Her indirme denetim kaydına yazılır."
              eylem={
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['cuzdan', 'Cüzdan'],
                      ['saglik', 'Sağlık'],
                      ['aliskanlik', 'Alışkanlık'],
                      ['spor', 'Spor'],
                      ['gunluk', 'Günlük'],
                      ['hedef', 'Hedefler'],
                    ] as const
                  ).map(([tur, ad]) => (
                    <a
                      key={tur}
                      href={`/api/v1/panel/disa-aktar?tur=${tur}`}
                      download
                      className="focus-ring rounded-btn border-line text-primary hover:border-line-hover inline-flex min-h-10 items-center border px-3 text-sm font-medium"
                    >
                      {ad}
                    </a>
                  ))}
                </div>
              }
            />

            <SettingsSection
              icon={DatabaseBackup}
              baslik="Yedek durumu"
              aciklama="Otomatik yedekleme henüz kurulmadı. Kurulduğunda son yedeğin zamanı, boyutu ve bütünlük doğrulaması burada görünecek; geri yükleme prosedürü ayrıca belgelenecek."
            />

            <SettingsSection
              icon={Bug}
              baslik="Hatalar"
              aciklama="Panelde oluşan sunucu ve ekran hataları — aynı hata kaç kez olduğuyla tek satırda."
              href="/panel/ayarlar/hatalar"
            />

            <SettingsSection
              icon={ScrollText}
              baslik="Denetim kaydı"
              aciklama="Panelde yapılan her değişikliğin kaydı: ne, ne zaman, hangi IP'den. Değişen alanların adları görünür, değerleri görünmez."
              href="/panel/ayarlar/denetim"
            />
          </div>
        </div>
      </main>
    </>
  );
}
