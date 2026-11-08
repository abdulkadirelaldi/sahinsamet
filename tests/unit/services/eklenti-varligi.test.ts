import { describe, expect, it, vi } from 'vitest';

import {
  findMissingAttachmentIds,
  type AttachmentExistenceClient,
} from '@/server/services/attachment';

/**
 * EKLENTİ VARLIK KONTROLÜ — T-051/B.
 *
 * Şema `cuidSchema` ile yalnızca BİÇİMİ doğruluyor; var olmayan bir kimlik
 * şemayı geçiyordu ve tek kapı veritabanındaki FK kısıtıydı. Bu kontrol kapıyı
 * yazmadan önceye taşıyor — böylece hangi form ALANININ bozuk olduğu, bir hata
 * kabuğunu ayrıştırmadan, kesin olarak biliniyor.
 */

function istemci(mevcutIdler: string[]) {
  const findMany = vi
    .fn()
    .mockImplementation((args: { where: { id: { in: string[] } } }) =>
      Promise.resolve(
        args.where.id.in.filter((id) => mevcutIdler.includes(id)).map((id) => ({ id })),
      ),
    );
  const client: AttachmentExistenceClient = { attachment: { findMany } };
  return { client, findMany };
}

describe('findMissingAttachmentIds', () => {
  it('hepsi varsa BOŞ dizi', async () => {
    const { client } = istemci(['ek_1', 'ek_2']);
    expect(await findMissingAttachmentIds(['ek_1', 'ek_2'], client)).toEqual([]);
  });

  it('eksik olanları döndürüyor', async () => {
    const { client } = istemci(['ek_1']);
    expect(await findMissingAttachmentIds(['ek_1', 'ek_yok'], client)).toEqual(['ek_yok']);
  });

  it('null/undefined/boş dize ELENİYOR — "seçilmedi" bir hata değil', async () => {
    const { client, findMany } = istemci([]);
    expect(await findMissingAttachmentIds([null, undefined, ''], client)).toEqual([]);
    // Sorgu HİÇ açılmıyor: en sık durum (eklenti seçilmemiş) bedava.
    expect(findMany).not.toHaveBeenCalled();
  });

  it('hiç kimlik yoksa sorgu AÇILMIYOR', async () => {
    const { client, findMany } = istemci([]);
    expect(await findMissingAttachmentIds([], client)).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('TEK sorgu — alan başına gidiş-dönüş yok', async () => {
    const { client, findMany } = istemci(['a']);
    await findMissingAttachmentIds(['a', 'b', 'c'], client);

    expect(findMany).toHaveBeenCalledOnce();
    expect(findMany.mock.calls[0]?.[0]).toEqual({
      where: { id: { in: ['a', 'b', 'c'] } },
      select: { id: true },
    });
  });

  it('YİNELENEN kimlik tekilleştiriliyor', async () => {
    // Profilde aynı dosya hem avatar hem cv seçilebilir.
    const { client, findMany } = istemci([]);
    await findMissingAttachmentIds(['ayni', 'ayni'], client);

    expect(findMany.mock.calls[0]?.[0].where.id.in).toEqual(['ayni']);
  });
});
