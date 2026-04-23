-- CreateTable
CREATE TABLE "TaskCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClientTaskCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientTaskCategory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClientTaskCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TaskCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskAssignee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actionItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,
    CONSTRAINT "TaskAssignee_actionItemId_fkey" FOREIGN KEY ("actionItemId") REFERENCES "ActionItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActionItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'to_do',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "boardOrder" INTEGER NOT NULL DEFAULT 0,
    "assignedTo" TEXT,
    "dueDate" TEXT,
    "completedAt" DATETIME,
    "outcome" TEXT,
    "sourceType" TEXT,
    "sourceRef" TEXT,
    "internalApprovedBy" TEXT,
    "internalApprovedAt" DATETIME,
    "clientApprovedBy" TEXT,
    "clientApprovedAt" DATETIME,
    "clientApprovalSource" TEXT,
    "approvalNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActionItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActionItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TaskCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ActionItem" ("assignedTo", "clientId", "completedAt", "createdAt", "description", "dueDate", "id", "outcome", "priority", "sourceRef", "sourceType", "status", "title", "updatedAt") SELECT "assignedTo", "clientId", "completedAt", "createdAt", "description", "dueDate", "id", "outcome", "priority", "sourceRef", "sourceType", "status", "title", "updatedAt" FROM "ActionItem";
DROP TABLE "ActionItem";
ALTER TABLE "new_ActionItem" RENAME TO "ActionItem";
CREATE INDEX "ActionItem_clientId_categoryId_status_boardOrder_idx" ON "ActionItem"("clientId", "categoryId", "status", "boardOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TaskCategory_slug_key" ON "TaskCategory"("slug");

-- CreateIndex
CREATE INDEX "ClientTaskCategory_clientId_sortOrder_idx" ON "ClientTaskCategory"("clientId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ClientTaskCategory_clientId_categoryId_key" ON "ClientTaskCategory"("clientId", "categoryId");

-- CreateIndex
CREATE INDEX "TaskAssignee_userId_idx" ON "TaskAssignee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskAssignee_actionItemId_userId_key" ON "TaskAssignee"("actionItemId", "userId");

-- Data migration: translate legacy ActionItem statuses
UPDATE "ActionItem" SET "status" = 'to_do' WHERE "status" = 'open';
UPDATE "ActionItem" SET "status" = 'done' WHERE "status" = 'completed';

-- Seed default task categories (stable IDs so they are referenceable across environments)
INSERT INTO "TaskCategory" ("id", "name", "slug", "color", "icon", "sortOrder", "isArchived", "createdAt", "updatedAt") VALUES
  ('tcat_paid_social',    'Paid Social',     'paid-social',     '#ec4899', 'Megaphone',   10, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tcat_content',        'Content',         'content',         '#8b5cf6', 'PenLine',     20, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tcat_outreach',       'Outreach',        'outreach',        '#0ea5e9', 'Send',        30, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tcat_technical',      'Technical',       'technical',       '#64748b', 'Wrench',      40, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tcat_paid_search',    'Paid Search',     'paid-search',     '#10b981', 'Search',      50, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tcat_email_marketing','Email Marketing', 'email-marketing', '#f59e0b', 'Mail',        60, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tcat_reporting',      'Reporting',       'reporting',       '#6366f1', 'BarChart3',   70, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Enable all default categories for every existing client, preserving sortOrder.
INSERT INTO "ClientTaskCategory" ("id", "clientId", "categoryId", "sortOrder", "isEnabled", "createdAt")
SELECT
  lower(hex(randomblob(12))) AS id,
  c.id AS clientId,
  tc.id AS categoryId,
  tc.sortOrder AS sortOrder,
  true AS isEnabled,
  CURRENT_TIMESTAMP AS createdAt
FROM "Client" c
CROSS JOIN "TaskCategory" tc;
