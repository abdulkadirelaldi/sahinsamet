-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('GYM', 'CARDIO', 'KAYAK', 'OTHER');

-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'LEGS', 'CORE', 'FULL_BODY', 'CARDIO', 'OTHER');

-- CreateEnum
CREATE TYPE "Equipment" AS ENUM ('BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'BODYWEIGHT', 'KETTLEBELL', 'BAND', 'OTHER');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ACHIEVED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "GoalPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "GoalCategory" AS ENUM ('CAREER', 'FINANCE', 'HEALTH', 'FITNESS', 'LEARNING', 'PERSONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'RESTORE', 'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'EXPORT');

-- CreateEnum
CREATE TYPE "AttachmentEntity" AS ENUM ('PROFILE');

-- CreateEnum
CREATE TYPE "WalletUnit" AS ENUM ('TRY', 'USD', 'EUR', 'GBP', 'GOLD_GRAM', 'GOLD_HAS', 'GOLD_QUARTER', 'GOLD_HALF', 'GOLD_FULL', 'GOLD_REPUBLIC', 'GOLD_ATA', 'GOLD_BANGLE_22', 'SILVER_GRAM');

-- CreateEnum
CREATE TYPE "WalletAccountKind" AS ENUM ('BANK', 'CASH', 'INVESTMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "WalletFlowKind" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "WalletFrequency" AS ENUM ('MONTHLY', 'WEEKLY', 'YEARLY', 'ONCE');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "writesValidFrom" TIMESTAMP(3),
    "totpSecret" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpConfirmedAt" TIMESTAMP(3),
    "totpBackupCodes" TEXT[],
    "totpSonKod" TEXT,
    "totpSonZaman" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT[],
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webauthn_challenge" (
    "id" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "userId" TEXT,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webauthn_challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempt" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmailHash" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "diff" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachment" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "entity" "AttachmentEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "headline" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "location" TEXT,
    "socials" JSONB,
    "avatarAttachmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_log" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weightKg" DECIMAL(5,2),
    "bodyFatPct" DECIMAL(4,1),
    "sleepHours" DECIMAL(4,2),
    "waterMl" INTEGER,
    "restingHr" INTEGER,
    "steps" INTEGER,
    "mood" INTEGER,
    "note" TEXT,
    "bmi" DECIMAL(4,1),
    "waterPct" DECIMAL(4,1),
    "muscleKg" DECIMAL(5,2),
    "boneKg" DECIMAL(4,2),
    "proteinPct" DECIMAL(4,1),
    "visceralFat" DECIMAL(4,1),
    "subcutaneousFatPct" DECIMAL(4,1),
    "skeletalMusclePct" DECIMAL(4,1),
    "bmrKcal" INTEGER,
    "metabolicAge" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "muscleGroup" "MuscleGroup" NOT NULL,
    "equipment" "Equipment" NOT NULL DEFAULT 'OTHER',
    "tip" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "WorkoutType" NOT NULL DEFAULT 'GYM',
    "durationMin" INTEGER,
    "feeling" INTEGER,
    "note" TEXT,
    "programDayId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "kcal" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_day" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "focus" TEXT,
    "weekday" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_exercise" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "sets" INTEGER NOT NULL,
    "reps" TEXT NOT NULL,
    "restSec" INTEGER NOT NULL DEFAULT 90,

    CONSTRAINT "program_exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_set" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "setNo" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weightKg" DECIMAL(6,2),
    "rpe" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_record" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "reps" INTEGER NOT NULL,
    "weightKg" DECIMAL(6,2) NOT NULL,
    "date" DATE NOT NULL,
    "workoutSetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetPerWeek" INTEGER NOT NULL DEFAULT 7,
    "targetPerDay" INTEGER,
    "color" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "otoKaynak" TEXT,
    "sureli" BOOLEAN NOT NULL DEFAULT false,
    "sayacBaslangic" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_log" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "missed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "habit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "GoalCategory" NOT NULL DEFAULT 'PERSONAL',
    "targetDate" DATE,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "period" "GoalPeriod",
    "periodKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "mood" INTEGER,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "WalletAccountKind" NOT NULL DEFAULT 'BANK',
    "unit" "WalletUnit" NOT NULL DEFAULT 'TRY',
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_debt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lender" TEXT,
    "unit" "WalletUnit" NOT NULL DEFAULT 'TRY',
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "remainingAmount" DECIMAL(14,2) NOT NULL,
    "monthlyPayment" DECIMAL(14,2),
    "paymentDay" INTEGER,
    "endDate" DATE,
    "note" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_debt_payment" (
    "id" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "hesapId" TEXT,
    "hesapTutar" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_debt_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_flow" (
    "id" TEXT NOT NULL,
    "kind" "WalletFlowKind" NOT NULL,
    "name" TEXT NOT NULL,
    "counterparty" TEXT,
    "unit" "WalletUnit" NOT NULL DEFAULT 'TRY',
    "amount" DECIMAL(14,2) NOT NULL,
    "frequency" "WalletFrequency" NOT NULL DEFAULT 'MONTHLY',
    "day" INTEGER,
    "date" DATE,
    "category" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hesapId" TEXT,
    "bitisGunu" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_flow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_butce" (
    "kategori" TEXT NOT NULL,
    "limitTl" DECIMAL(12,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_butce_pkey" PRIMARY KEY ("kategori")
);

-- CreateTable
CREATE TABLE "islem_anahtari" (
    "anahtar" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "islem_anahtari_pkey" PRIMARY KEY ("anahtar")
);

-- CreateTable
CREATE TABLE "saglik_baglantisi" (
    "userId" TEXT NOT NULL,
    "anahtarOzeti" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sonKullanim" TIMESTAMP(3),

    CONSTRAINT "saglik_baglantisi_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "wallet_odeme" (
    "id" TEXT NOT NULL,
    "kaynakTur" TEXT NOT NULL,
    "kaynakId" TEXT NOT NULL,
    "donem" TEXT NOT NULL,
    "durum" TEXT NOT NULL,
    "hesapId" TEXT,
    "tutar" DECIMAL(12,2),
    "gun" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_odeme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "net_varlik_kaydi" (
    "gun" DATE NOT NULL,
    "varlikTl" DECIMAL(14,2) NOT NULL,
    "borcTl" DECIMAL(14,2) NOT NULL,
    "netTl" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "net_varlik_kaydi_pkey" PRIMARY KEY ("gun")
);

-- CreateTable
CREATE TABLE "wallet_transfer" (
    "id" TEXT NOT NULL,
    "kaynakId" TEXT NOT NULL,
    "hedefId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "gun" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_quote" (
    "unit" "WalletUnit" NOT NULL,
    "buying" DECIMAL(18,4) NOT NULL,
    "selling" DECIMAL(18,4) NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_quote_pkey" PRIMARY KEY ("unit")
);

-- CreateTable
CREATE TABLE "saglik_hedefi" (
    "userId" TEXT NOT NULL,
    "hedefKg" DECIMAL(5,2) NOT NULL,
    "baslangicKg" DECIMAL(5,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saglik_hedefi_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "push_abonelik" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "cihaz" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_abonelik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bildirim_tercihi" (
    "userId" TEXT NOT NULL,
    "borc" BOOLEAN NOT NULL DEFAULT true,
    "aliskanlik" BOOLEAN NOT NULL DEFAULT true,
    "su" BOOLEAN NOT NULL DEFAULT true,
    "rekor" BOOLEAN NOT NULL DEFAULT true,
    "haftalik" BOOLEAN NOT NULL DEFAULT true,
    "aylik" BOOLEAN NOT NULL DEFAULT true,
    "ingilizce" BOOLEAN NOT NULL DEFAULT true,
    "suHedefMl" INTEGER NOT NULL DEFAULT 3500,
    "suSaatleri" INTEGER[] DEFAULT ARRAY[11, 15, 18]::INTEGER[],
    "aliskanlikSaati" INTEGER NOT NULL DEFAULT 21,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bildirim_tercihi_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "bildirim_kaydi" (
    "id" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "gun" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bildirim_kaydi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hata_kaydi" (
    "id" TEXT NOT NULL,
    "imza" TEXT NOT NULL,
    "kaynak" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "mesaj" TEXT NOT NULL,
    "yol" TEXT,
    "ayrinti" TEXT,
    "sayi" INTEGER NOT NULL DEFAULT 1,
    "ilk" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "son" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hata_kaydi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingilizce_ders" (
    "id" TEXT NOT NULL,
    "dersId" TEXT NOT NULL,
    "gun" DATE NOT NULL,
    "xp" INTEGER NOT NULL,
    "hatalar" TEXT[],
    "dogrular" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingilizce_ders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingilizce_ayar" (
    "userId" TEXT NOT NULL,
    "gunlukHedefXp" INTEGER NOT NULL DEFAULT 20,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingilizce_ayar_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "passkey_credentialId_key" ON "passkey"("credentialId");

-- CreateIndex
CREATE INDEX "passkey_userId_idx" ON "passkey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "webauthn_challenge_challenge_key" ON "webauthn_challenge"("challenge");

-- CreateIndex
CREATE INDEX "webauthn_challenge_expiresAt_idx" ON "webauthn_challenge"("expiresAt");

-- CreateIndex
CREATE INDEX "login_attempt_ip_createdAt_idx" ON "login_attempt"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "login_attempt_emailHash_createdAt_idx" ON "login_attempt"("emailHash", "createdAt");

-- CreateIndex
CREATE INDEX "login_attempt_createdAt_idx" ON "login_attempt"("createdAt");

-- CreateIndex
CREATE INDEX "audit_log_entity_entityId_idx" ON "audit_log"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "audit_log_actorId_idx" ON "audit_log"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "attachment_key_key" ON "attachment"("key");

-- CreateIndex
CREATE INDEX "attachment_entity_entityId_order_idx" ON "attachment"("entity", "entityId", "order");

-- CreateIndex
CREATE INDEX "attachment_uploadedById_idx" ON "attachment"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "health_log_date_key" ON "health_log"("date");

-- CreateIndex
CREATE INDEX "health_log_date_idx" ON "health_log"("date");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_name_key" ON "exercise"("name");

-- CreateIndex
CREATE INDEX "exercise_muscleGroup_isArchived_idx" ON "exercise"("muscleGroup", "isArchived");

-- CreateIndex
CREATE INDEX "workout_date_type_idx" ON "workout"("date", "type");

-- CreateIndex
CREATE INDEX "program_day_isArchived_order_idx" ON "program_day"("isArchived", "order");

-- CreateIndex
CREATE INDEX "program_exercise_dayId_order_idx" ON "program_exercise"("dayId", "order");

-- CreateIndex
CREATE INDEX "workout_set_exerciseId_idx" ON "workout_set"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_set_workoutId_exerciseId_setNo_key" ON "workout_set"("workoutId", "exerciseId", "setNo");

-- CreateIndex
CREATE UNIQUE INDEX "personal_record_workoutSetId_key" ON "personal_record"("workoutSetId");

-- CreateIndex
CREATE INDEX "personal_record_exerciseId_date_idx" ON "personal_record"("exerciseId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "personal_record_exerciseId_reps_key" ON "personal_record"("exerciseId", "reps");

-- CreateIndex
CREATE INDEX "habit_isActive_isArchived_idx" ON "habit"("isActive", "isArchived");

-- CreateIndex
CREATE INDEX "habit_log_date_idx" ON "habit_log"("date");

-- CreateIndex
CREATE UNIQUE INDEX "habit_log_habitId_date_key" ON "habit_log"("habitId", "date");

-- CreateIndex
CREATE INDEX "goal_status_targetDate_idx" ON "goal"("status", "targetDate");

-- CreateIndex
CREATE INDEX "goal_category_idx" ON "goal"("category");

-- CreateIndex
CREATE INDEX "goal_period_periodKey_idx" ON "goal"("period", "periodKey");

-- CreateIndex
CREATE INDEX "journal_entry_date_idx" ON "journal_entry"("date");

-- CreateIndex
CREATE INDEX "wallet_account_isArchived_order_idx" ON "wallet_account"("isArchived", "order");

-- CreateIndex
CREATE INDEX "wallet_debt_isClosed_idx" ON "wallet_debt"("isClosed");

-- CreateIndex
CREATE INDEX "wallet_debt_payment_debtId_date_idx" ON "wallet_debt_payment"("debtId", "date");

-- CreateIndex
CREATE INDEX "wallet_debt_payment_date_idx" ON "wallet_debt_payment"("date");

-- CreateIndex
CREATE INDEX "wallet_flow_kind_isActive_idx" ON "wallet_flow"("kind", "isActive");

-- CreateIndex
CREATE INDEX "islem_anahtari_createdAt_idx" ON "islem_anahtari"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "saglik_baglantisi_anahtarOzeti_key" ON "saglik_baglantisi"("anahtarOzeti");

-- CreateIndex
CREATE INDEX "wallet_odeme_donem_idx" ON "wallet_odeme"("donem");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_odeme_kaynakTur_kaynakId_donem_key" ON "wallet_odeme"("kaynakTur", "kaynakId", "donem");

-- CreateIndex
CREATE INDEX "wallet_transfer_gun_idx" ON "wallet_transfer"("gun");

-- CreateIndex
CREATE UNIQUE INDEX "push_abonelik_endpoint_key" ON "push_abonelik"("endpoint");

-- CreateIndex
CREATE INDEX "push_abonelik_userId_idx" ON "push_abonelik"("userId");

-- CreateIndex
CREATE INDEX "bildirim_kaydi_gun_idx" ON "bildirim_kaydi"("gun");

-- CreateIndex
CREATE UNIQUE INDEX "bildirim_kaydi_tur_anahtar_gun_key" ON "bildirim_kaydi"("tur", "anahtar", "gun");

-- CreateIndex
CREATE UNIQUE INDEX "hata_kaydi_imza_key" ON "hata_kaydi"("imza");

-- CreateIndex
CREATE INDEX "hata_kaydi_son_idx" ON "hata_kaydi"("son");

-- CreateIndex
CREATE INDEX "ingilizce_ders_dersId_idx" ON "ingilizce_ders"("dersId");

-- CreateIndex
CREATE INDEX "ingilizce_ders_gun_idx" ON "ingilizce_ders"("gun");

-- AddForeignKey
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_avatarAttachmentId_fkey" FOREIGN KEY ("avatarAttachmentId") REFERENCES "attachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout" ADD CONSTRAINT "workout_programDayId_fkey" FOREIGN KEY ("programDayId") REFERENCES "program_day"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_exercise" ADD CONSTRAINT "program_exercise_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "program_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_exercise" ADD CONSTRAINT "program_exercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_set" ADD CONSTRAINT "workout_set_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_set" ADD CONSTRAINT "workout_set_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_record" ADD CONSTRAINT "personal_record_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_record" ADD CONSTRAINT "personal_record_workoutSetId_fkey" FOREIGN KEY ("workoutSetId") REFERENCES "workout_set"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_log" ADD CONSTRAINT "habit_log_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_debt_payment" ADD CONSTRAINT "wallet_debt_payment_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "wallet_debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
