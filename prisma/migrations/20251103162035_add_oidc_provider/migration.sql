-- AlterEnum (idempotent - only add if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'OIDC' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Provider')) THEN
        ALTER TYPE "Provider" ADD VALUE 'OIDC';
    END IF;
END $$;
