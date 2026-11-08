import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

/**
 * Bileşen test koşum takımının (harness) çalıştığını kanıtlar:
 * jsdom ortamı, JSX derlemesi, `@testing-library/react` sorguları,
 * `jest-dom` eşleştiricileri ve `user-event` klavye simülasyonu.
 *
 * NEDEN GERÇEK BİR PROJE BİLEŞENİ RENDER EDİLMİYOR: `src/components/**`
 * Frontend ajanının mülkiyetinde ve T-002 hâlâ devam ediyor (STATUS.md).
 * Buradan `Button` veya `Input` içe aktarsaydım, altyapıyı doğrulaması
 * gereken bu test Frontend'in her arayüz değişikliğinde kırılır ve gerçek
 * bir sorun yokken CI'yı kırmızıya çevirirdi. Primitiflerin kendi testleri
 * T-002 kabulünden sonra, Frontend'in yayımladığı sözleşme üzerine yazılır.
 *
 * Türkçe metin bilinçli: `latin-ext` karakterlerinin sorgu katmanından
 * geçtiğini de doğrular (§3.2).
 */

function SayacKutusu() {
  const [sayi, setSayi] = useState(0);

  return (
    <div>
      <h2>Ölçüm sayacı</h2>
      <p>
        Toplam: <output>{sayi}</output>
      </p>
      <button type="button" onClick={() => setSayi((onceki) => onceki + 1)}>
        Değer ekle
      </button>
    </div>
  );
}

describe('bileşen test altyapısı', () => {
  it('jsdom içinde render eder ve erişilebilir rollerle bulunur', () => {
    render(<SayacKutusu />);

    expect(screen.getByRole('heading', { name: 'Ölçüm sayacı' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Değer ekle' })).toBeVisible();
  });

  /**
   * §1.1 K5 — "klavye ile tam gezinilebilir". Bu testin fare değil klavye
   * kullanması bilinçli: F2'den itibaren yazılacak bileşen testleri için
   * izlenecek desen budur.
   */
  it('klavyeyle etkileşime girilebilir', async () => {
    const user = userEvent.setup();
    render(<SayacKutusu />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Değer ekle' })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('1');
  });

  it('testler arasında DOM temizlenir — setup.ts cleanup çalışıyor', () => {
    render(<SayacKutusu />);

    // Önceki iki test de render etti; temizlik olmasaydı burada üç eşleşme olurdu.
    expect(screen.getAllByRole('heading', { name: 'Ölçüm sayacı' })).toHaveLength(1);
  });
});
