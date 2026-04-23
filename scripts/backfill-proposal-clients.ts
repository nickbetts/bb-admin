/**
 * One-time backfill script: match existing proposals' clientName to Client records
 * and populate the new clientId FK.
 *
 * Usage: npx tsx scripts/backfill-proposal-clients.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Get all proposals without a clientId
  const proposals = await prisma.proposal.findMany({
    where: { clientId: null },
    select: { id: true, clientName: true },
  });

  console.log(`Found ${proposals.length} proposals without clientId`);

  // Build a lookup of all clients by lowercase name
  const clients = await prisma.client.findMany({
    select: { id: true, name: true },
  });

  const clientByName = new Map<string, { id: string; name: string }>();
  for (const client of clients) {
    const key = client.name.toLowerCase().trim();
    if (clientByName.has(key)) {
      console.warn(`  Duplicate client name "${client.name}" — skipping duplicate`);
      clientByName.delete(key); // Remove ambiguous matches
    } else {
      clientByName.set(key, client);
    }
  }

  let matched = 0;
  let unmatched = 0;

  for (const proposal of proposals) {
    const key = proposal.clientName.toLowerCase().trim();
    const client = clientByName.get(key);

    if (client) {
      await prisma.proposal.update({
        where: { id: proposal.id },
        data: { clientId: client.id },
      });
      matched++;
      console.log(`  ✓ "${proposal.clientName}" → ${client.name} (${client.id})`);
    } else {
      unmatched++;
      console.log(`  ✗ "${proposal.clientName}" — no matching client`);
    }
  }

  console.log(`\nDone: ${matched} matched, ${unmatched} unmatched (cold-outreach prospects)`);
}

main()
  .catch((e) => {
    console.error("Backfill error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
