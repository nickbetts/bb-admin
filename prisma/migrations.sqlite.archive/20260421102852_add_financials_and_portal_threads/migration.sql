-- CreateTable
CREATE TABLE "ClientRetainer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "monthlyFee" REAL NOT NULL,
    "contractedHours" REAL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientRetainer_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "invoiceRef" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "issuedDate" TEXT NOT NULL,
    "dueDate" TEXT,
    "paidDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientInvoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgencyTimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "hours" REAL NOT NULL,
    "category" TEXT,
    "notes" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgencyTimeEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgencyTimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PortalThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PortalThread_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PortalMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "authorType" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortalMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "PortalThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ClientRetainer_clientId_startDate_idx" ON "ClientRetainer"("clientId", "startDate");

-- CreateIndex
CREATE INDEX "ClientInvoice_clientId_paidDate_idx" ON "ClientInvoice"("clientId", "paidDate");

-- CreateIndex
CREATE UNIQUE INDEX "ClientInvoice_clientId_invoiceRef_key" ON "ClientInvoice"("clientId", "invoiceRef");

-- CreateIndex
CREATE INDEX "AgencyTimeEntry_clientId_date_idx" ON "AgencyTimeEntry"("clientId", "date");

-- CreateIndex
CREATE INDEX "AgencyTimeEntry_userId_date_idx" ON "AgencyTimeEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "PortalThread_clientId_lastMessageAt_idx" ON "PortalThread"("clientId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "PortalMessage_threadId_createdAt_idx" ON "PortalMessage"("threadId", "createdAt");
