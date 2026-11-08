'use client';

import { ScrollText } from 'lucide-react';

import { EYLEM_ETIKET, EYLEM_VARYANT } from '@/components/panel/denetim-gorunumleri';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import type { AuditLogListItemDto } from '@/server/services/audit-log';

/**
 * DENETİM KAYDI LİSTESİ — §4.2 `/panel/ayarlar/denetim`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ `diff` DEĞERLERİ EKRANA BASILMIYOR — SÖZLEŞME BAĞLAYICI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `AuditDiffSummaryDto` iki alan taşıyor ve bu bileşen İKİSİNİ DE olduğu gibi
 * kullanıyor, daha fazlasını istemiyor:
 *
 *   `fields` → değişen alanların YOL ADLARI. Etiket listesi gibi basılıyor.
 *   `values` → yalnızca izinli anahtarların değerleri. SADECE VARSA gösteriliyor.
 *
 * Ham `diff` DTO'da HİÇ YOK ve bu arayüzün isteyebileceği bir şey değil. ADR-034
 * üç sızıntı sınıfı ölçtü (`yeniSifre`, `pass`, `note: 'şifre: …'`) ve üçü de
 * DEĞER sızıntısıydı; değerleri hiç göstermemek o yüzeyin tamamını ADA BAKMADAN
 * kapatıyor. "Önce ham gönderelim, arayüz süzsün" demek DTO tipini değiştirmek
 * demek — yani karar sessizce aşılamaz.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * `ip` LİSTEDE, `userAgent` HİÇ YOK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Backend'in gerekçesi: denetimde IP'nin değeri KARŞILAŞTIRMALI — yabancıyı bir
 * kolonu tararak fark edersiniz, tek satıra bakarak değil. `userAgent` DTO'da
 * hiç seçilmiyor; onu göstermek için bir detay rotası açmak, çağıranı olmayan
 * bir rota ve ekranda gereksiz kişisel veri olurdu. Bu yüzden DETAY ROTASI YOK.
 *
 * Satır tıklanabilir DEĞİL ve olmamalı: gidecek bir yer yok, ölü bağlantı
 * koymuyoruz (T-018).
 */
export function DenetimEkrani({
  kayitlar,
  toplam,
}: {
  kayitlar: AuditLogListItemDto[];
  toplam: number;
}) {
  const sutunlar: ReadonlyArray<Sutun<AuditLogListItemDto>> = [
    {
      anahtar: 'createdAt',
      baslik: 'Tarih',
      /* §3.2 — tarih sütunu sekmeli rakam + sağa yaslı, göz tarayabilsin. */
      sayisal: true,
      deger: (k) => (
        <span className="whitespace-nowrap">{new Date(k.createdAt).toLocaleString('tr-TR')}</span>
      ),
      siralamaDegeri: (k) => k.createdAt,
    },
    {
      anahtar: 'action',
      baslik: 'Eylem',
      deger: (k) => <Badge variant={EYLEM_VARYANT[k.action]}>{EYLEM_ETIKET[k.action]}</Badge>,
      siralamaDegeri: (k) => EYLEM_ETIKET[k.action],
    },
    {
      anahtar: 'entity',
      baslik: 'Kayıt',
      deger: (k) => (
        <div className="flex flex-col">
          <span className="text-primary">{k.entity}</span>
          {/* Kimlik `tabular`: iki satırın aynı kaydı mı gösterdiği göz
              karşılaştırmasıyla anlaşılsın (§3.2). */}
          {k.entityId && <span className="tabular text-muted text-xs">{k.entityId}</span>}
        </div>
      ),
      siralamaDegeri: (k) => k.entity,
    },
    {
      anahtar: 'ip',
      baslik: 'IP',
      sayisal: true,
      ikincil: true,
      /* Kaydedilmemişse "—": boş hücre "IP yok" ile "okunamadı"yı ayırmaz. */
      deger: (k) => k.ip ?? '—',
      siralamaDegeri: (k) => k.ip ?? '',
    },
    {
      anahtar: 'diff',
      baslik: 'Değişen',
      deger: (k) => <DiffOzeti diff={k.diff} />,
      /* Sıralanabilir DEĞİL: alan listesini neye göre sıralayacağı belirsiz,
         tıklanıp anlamsız bir sıra üreten başlık olmasın. */
    },
  ];

  return (
    <VeriTablosu
      baslik="Denetim kaydı"
      satirlar={kayitlar}
      sutunlar={sutunlar}
      satirAnahtari={(k) => k.id}
      bosDurum={
        <EmptyState
          icon={ScrollText}
          title={toplam === 0 ? 'Bu süzgeçte kayıt yok' : 'Bu sayfada kayıt yok'}
          description="Eylem sekmesini ya da tarih aralığını değiştirip tekrar bakabilirsin. Panelde yapılan her değişiklik buraya yazılır."
        />
      }
    />
  );
}

/**
 * `diff` ÖZETİ — alan adları etiket, değerler yalnızca izinliyse.
 *
 * `values` anahtarları `fields` içinde de geçiyor; o yüzden değeri OLAN alan
 * iki kez görünmesin diye ayrıştırılıyor: değerli olanlar `ad: değer` biçiminde,
 * kalanlar düz etiket olarak.
 */
function DiffOzeti({ diff }: { diff: AuditLogListItemDto['diff'] }) {
  const degerliler = Object.entries(diff.values);
  const degerliAdlar = new Set(degerliler.map(([ad]) => ad));
  const sadeAlanlar = diff.fields.filter((ad) => !degerliAdlar.has(ad));

  if (degerliler.length === 0 && sadeAlanlar.length === 0) {
    return <span className="text-muted text-xs">—</span>;
  }

  return (
    <div className="flex max-w-sm flex-wrap gap-1">
      {degerliler.map(([ad, deger]) => (
        <Badge key={ad} variant="accent">
          <span className="tabular">{ad}</span>: {deger}
        </Badge>
      ))}

      {sadeAlanlar.map((ad) => (
        <Badge key={ad} variant="neutral">
          <span className="tabular">{ad}</span>
        </Badge>
      ))}
    </div>
  );
}
