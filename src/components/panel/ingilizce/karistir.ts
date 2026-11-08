/**
 * Tohumlu karıştırma (2026-11-06): aynı kimlik sunucuda ve tarayıcıda aynı sırayı verir,
 * hidrasyon uyuşmazlığı olmaz; yine de her soru kendi sırasında gelir. SAF.
 */
export function karistir<T>(liste: readonly T[], tohum: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < tohum.length; i += 1) h = Math.imul(h ^ tohum.charCodeAt(i), 16777619);
  const rastgele = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const sonuc = [...liste];
  for (let i = sonuc.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rastgele() * (i + 1));
    [sonuc[i], sonuc[j]] = [sonuc[j]!, sonuc[i]!];
  }
  return sonuc;
}
