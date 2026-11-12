-- 2026-11-12 — Takvim etkinliği ↔ spor programı günü (isteğe bağlı bağ, eklemeli).

-- AlterTable
ALTER TABLE "takvim_etkinligi" ADD COLUMN     "programDayId" TEXT;

-- CreateIndex
CREATE INDEX "takvim_etkinligi_programDayId_idx" ON "takvim_etkinligi"("programDayId");

-- AddForeignKey
ALTER TABLE "takvim_etkinligi" ADD CONSTRAINT "takvim_etkinligi_programDayId_fkey" FOREIGN KEY ("programDayId") REFERENCES "program_day"("id") ON DELETE SET NULL ON UPDATE CASCADE;
