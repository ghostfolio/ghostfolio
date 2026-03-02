-- CreateTable
CREATE TABLE "AgentChatLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "totalSteps" INTEGER NOT NULL,
    "toolsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "errorOccurred" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentChatLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentChatLog_requestId_key" ON "AgentChatLog"("requestId");

-- CreateIndex
CREATE INDEX "AgentChatLog_userId_idx" ON "AgentChatLog"("userId");

-- CreateIndex
CREATE INDEX "AgentChatLog_createdAt_idx" ON "AgentChatLog"("createdAt");
