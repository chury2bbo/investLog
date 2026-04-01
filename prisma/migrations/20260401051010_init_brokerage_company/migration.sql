-- CreateTable
CREATE TABLE "BrokerageCompany" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "financialCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrokerageCompany_pkey" PRIMARY KEY ("code")
);
