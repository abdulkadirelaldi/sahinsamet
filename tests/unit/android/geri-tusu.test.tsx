import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GERI_ISARETI, useGeriTusuylaKapat } from '@/components/panel/geri-tusu';

/**
 * ANDROID GERİ HAREKETİ — kanca jsdom'un gerçek `history`siyle sınanır: açılınca adres aynı
 * kalarak kayıt eklenir, geri gelince `kapat`, arayüzden kapatınca kayıt geri alınır.
 */
const tikTak = () => act(() => new Promise((r) => setTimeout(r, 0)));

let baslangic: number;
beforeEach(() => {
  window.history.replaceState(null, '', '/panel');
  baslangic = window.history.length;
});
afterEach(async () => {
  // Söküm kancanın `history.back()`ini tetikler; jsdom onu bir sonraki görevde işler. Bekle ki
  // o `popstate` sonraki teste düşmesin.
  cleanup();
  vi.restoreAllMocks();
  await new Promise((r) => setTimeout(r, 30));
});

describe('useGeriTusuylaKapat', () => {
  it('açılınca adres değişmeden bir geçmiş kaydı eklenir', async () => {
    renderHook(() => useGeriTusuylaKapat(true, () => undefined));
    await tikTak();
    expect(window.history.length).toBe(baslangic + 1);
    expect(window.location.pathname).toBe('/panel');
    expect((window.history.state as Record<string, unknown>)[GERI_ISARETI]).toBe(true);
  });

  it('geri hareketi (popstate) kapatır ve kayıt ikinci kez geri alınmaz', async () => {
    const kapat = vi.fn();
    const { rerender } = renderHook(({ acik }) => useGeriTusuylaKapat(acik, kapat), {
      initialProps: { acik: true },
    });
    await tikTak();
    const geri = vi.spyOn(window.history, 'back');
    act(() => window.dispatchEvent(new PopStateEvent('popstate', { state: null })));
    expect(kapat).toHaveBeenCalledTimes(1);
    rerender({ acik: false });
    expect(geri).not.toHaveBeenCalled();
  });

  it('kaydın popstate olayı Next dinleyicisine ulaşmaz: bekleyen tazeleme iptal olmasın', async () => {
    const next = vi.fn();
    window.addEventListener('popstate', next);
    renderHook(() => useGeriTusuylaKapat(true, () => undefined));
    await tikTak();
    act(() => window.dispatchEvent(new PopStateEvent('popstate', { state: null })));
    expect(next).not.toHaveBeenCalled();
    window.removeEventListener('popstate', next);
  });

  it('arayüzden kapanınca eklenen kayıt geri alınır', async () => {
    const { rerender } = renderHook(({ acik }) => useGeriTusuylaKapat(acik, () => undefined), {
      initialProps: { acik: true },
    });
    await tikTak();
    const geri = vi.spyOn(window.history, 'back');
    rerender({ acik: false });
    expect(geri).toHaveBeenCalledTimes(1);
  });

  it('kayıt eklenmeden kapanırsa (StrictMode çift çağrısı) geri alınacak bir şey yok', () => {
    const geri = vi.spyOn(window.history, 'back');
    const ekle = vi.spyOn(window.history, 'pushState');
    const { unmount } = renderHook(() => useGeriTusuylaKapat(true, () => undefined));
    unmount();
    expect(ekle).not.toHaveBeenCalled();
    expect(geri).not.toHaveBeenCalled();
  });

  it('sayfadaki bağlantıya dokunulduysa geri alınmaz (bağlantı kaydın yerine yazar)', async () => {
    const { rerender } = renderHook(({ acik }) => useGeriTusuylaKapat(acik, () => undefined), {
      initialProps: { acik: true },
    });
    await tikTak();
    const a = document.createElement('a');
    a.href = '/panel/hayat';
    a.addEventListener('click', (e) => e.preventDefault());
    document.body.append(a);
    const geri = vi.spyOn(window.history, 'back');
    act(() => a.click());
    rerender({ acik: false });
    expect(geri).not.toHaveBeenCalled();
    a.remove();
  });

  it('kapanırken adres değiştiyse (programla gezinme) geri alınmaz', async () => {
    const { rerender } = renderHook(({ acik }) => useGeriTusuylaKapat(acik, () => undefined), {
      initialProps: { acik: true },
    });
    await tikTak();
    window.history.pushState(null, '', '/panel/cuzdan');
    const geri = vi.spyOn(window.history, 'back');
    rerender({ acik: false });
    expect(geri).not.toHaveBeenCalled();
  });

  it('kapalıyken hiçbir şey yapmaz', async () => {
    const ekle = vi.spyOn(window.history, 'pushState');
    renderHook(() => useGeriTusuylaKapat(false, () => undefined));
    await tikTak();
    expect(ekle).not.toHaveBeenCalled();
  });

  it('gerçek geri: kayıt sökülünce adres aynı, kapat çağrılır', async () => {
    const kapat = vi.fn();
    renderHook(() => useGeriTusuylaKapat(true, kapat));
    await tikTak();
    act(() => window.history.back());
    await waitFor(() => expect(kapat).toHaveBeenCalled());
    expect(window.location.pathname).toBe('/panel');
  });
});
