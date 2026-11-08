import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProfileDto } from '@/server/services/content-dto';

/*
 * Tema düğmesi tema sağlayıcısına ve `usePathname`e bağlı — burada ölçülen şey
 * profil içeriği, düğmenin kendisi değil.
 */
vi.mock('@/components/ui/theme-toggle', () => ({
  ThemeToggle: () => <button type="button">Tema</button>,
}));

const { ProfilSayfasi } = await import('@/components/profil/profil-sayfasi');

const BOS: ProfileDto = {
  id: 'singleton',
  headline: '',
  bio: '',
  location: null,
  socials: {},
  avatar: null,
};

describe('public tek sayfa — profil', () => {
  it('ad tek h1, tanıtım satırı, konum ve kısa tanıtım görünüyor', () => {
    render(
      <ProfilSayfasi
        profil={{
          ...BOS,
          headline: 'Fotoğrafçı ve video üreticisi',
          bio: 'Kısa bir tanıtım.\nİkinci satır.',
          location: 'İstanbul',
        }}
      />,
    );

    const basliklar = screen.getAllByRole('heading', { level: 1 });
    expect(basliklar).toHaveLength(1);
    expect(basliklar[0]).toHaveTextContent('Samet Şahin');
    expect(screen.getByText('Fotoğrafçı ve video üreticisi')).toBeInTheDocument();
    expect(screen.getByText('İstanbul')).toBeInTheDocument();
    expect(screen.getByText(/Kısa bir tanıtım\./)).toBeInTheDocument();
  });

  it('sosyal bağlantılar SABİT sırayla, doğru hedef ve güvenli rel ile', () => {
    render(
      <ProfilSayfasi
        profil={{
          ...BOS,
          headline: 'Merhaba',
          socials: {
            github: 'https://github.com/ornek',
            instagram: 'https://www.instagram.com/samet.ornek/',
            email: 'samet@ornek.com',
            youtube: 'https://youtube.com/@kanal',
          },
        }}
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'Sosyal bağlantılar' });
    const linkler = within(nav).getAllByRole('link');
    expect(linkler.map((l) => l.getAttribute('href'))).toEqual([
      'https://www.instagram.com/samet.ornek/',
      'https://youtube.com/@kanal',
      'https://github.com/ornek',
      'mailto:samet@ornek.com',
    ]);

    const instagram = linkler[0]!;
    expect(instagram).toHaveTextContent('Instagram');
    expect(instagram).toHaveTextContent('@samet.ornek');
    expect(instagram).toHaveAttribute('target', '_blank');
    expect(instagram.getAttribute('rel')).toContain('noopener');

    // E-posta yeni sekmede açılmıyor.
    expect(linkler[3]).not.toHaveAttribute('target');
    expect(linkler[3]).toHaveTextContent('samet@ornek.com');
  });

  it('BOŞ profil: bağlantı bölümü, konum ve tanıtım HİÇ çizilmiyor; baş harfler görünüyor', () => {
    render(<ProfilSayfasi profil={BOS} />);

    expect(screen.queryByRole('navigation', { name: 'Sosyal bağlantılar' })).toBeNull();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.getByRole('img', { name: 'Samet Şahin' })).toHaveTextContent('SŞ');
  });

  it('fotoğraf varsa aynı kökenden `<img>` olarak çiziliyor', () => {
    render(
      <ProfilSayfasi
        profil={{
          ...BOS,
          avatar: {
            id: 'ckavatar0000000000000001',
            key: 'k',
            mime: 'image/webp',
            width: 400,
            height: 400,
          },
        }}
      />,
    );
    const img = screen.getByRole('img', { name: 'Samet Şahin' });
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', '/api/v1/dosya/ckavatar0000000000000001');
  });
});
