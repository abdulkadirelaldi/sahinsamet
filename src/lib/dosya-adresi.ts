/**
 * Eklentinin KALICI adresi — ADR-044.
 *
 * Tarayıcı R2'ye hiç gitmiyor; dosyayı `GET /api/v1/dosya/[id]` aynı kökenden
 * veriyor. Bu yüzden adres İMZASIZ ve BAYATLAMAZ: önbellekli bir sayfaya
 * güvenle basılabilir (ADR-018'in imzalı adres × önbellek çatışması doğmuyor)
 * ve CSP `img-src 'self'` kalıyor. Adresi üreten TEK yer burası.
 */
export function dosyaAdresi(id: string): string {
  return `/api/v1/dosya/${encodeURIComponent(id)}`;
}
