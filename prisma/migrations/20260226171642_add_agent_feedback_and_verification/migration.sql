-- AlterTable
ALTER TABLE "AgentChatLog" ADD COLUMN     "verificationResult" JSONB,
ADD COLUMN     "verificationScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "AgentFeedback" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentFeedback_createdAt_idx" ON "AgentFeedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentFeedback_requestId_userId_key" ON "AgentFeedback"("requestId", "userId");

-- AddForeignKey
ALTER TABLE "AgentFeedback" ADD CONSTRAINT "AgentFeedback_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AgentChatLog"("requestId") ON DELETE RESTRICT ON UPDATE CASCADE;
