-- 2026-11-10 — Takvim: etkinlikler (tekrar, istisna, hatırlatma) ve bildirim tercihi.

-- CreateEnum
CREATE TYPE "TakvimKategori" AS ENUM ('SPOR', 'TOPLANTI', 'SAGLIK', 'HATIRLATICI', 'KISISEL', 'IS', 'DIGER');

-- CreateEnum
CREATE TYPE "TakvimTekrar" AS ENUM ('YOK', 'GUNLUK', 'HAFTALIK', 'AYLIK', 'YILLIK');

-- AlterTable
ALTER TABLE "bildirim_tercihi" ADD COLUMN     "takvim" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "takvim_etkinligi" (
    "id" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "aciklama" TEXT,
    "konum" TEXT,
    "kategori" "TakvimKategori" NOT NULL DEFAULT 'KISISEL',
    "tumGun" BOOLEAN NOT NULL DEFAULT false,
    "baslangic" TIMESTAMP(3) NOT NULL,
    "bitis" TIMESTAMP(3) NOT NULL,
    "tekrar" "TakvimTekrar" NOT NULL DEFAULT 'YOK',
    "tekrarAralik" INTEGER NOT NULL DEFAULT 1,
    "tekrarGunleri" INTEGER[],
    "tekrarBitis" DATE,
    "tekrarSayisi" INTEGER,
    "istisnalar" DATE[],
    "hatirlatmalar" INTEGER[],
    "seriId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "takvim_etkinligi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "takvim_etkinligi_baslangic_idx" ON "takvim_etkinligi"("baslangic");

-- CreateIndex
CREATE INDEX "takvim_etkinligi_tekrar_idx" ON "takvim_etkinligi"("tekrar");

-- CreateIndex
CREATE INDEX "takvim_etkinligi_seriId_idx" ON "takvim_etkinligi"("seriId");

-- AddForeignKey
ALTER TABLE "takvim_etkinligi" ADD CONSTRAINT "takvim_etkinligi_seriId_fkey" FOREIGN KEY ("seriId") REFERENCES "takvim_etkinligi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
