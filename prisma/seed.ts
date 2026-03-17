import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL ?? "file:dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const adapter = new PrismaLibSql({ url, ...(authToken ? { authToken } : {}) });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@i3media.co.uk" },
    update: {},
    create: {
      email: "admin@i3media.co.uk",
      name: "Admin",
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("✅ Created admin user:", admin.email);

  // Create sample clients
  const client1 = await prisma.client.upsert({
    where: { slug: "demo-client" },
    update: {},
    create: {
      name: "Demo Client",
      slug: "demo-client",
      website: "https://example.com",
      semrushDomain: "example.com",
    },
  });

  console.log("✅ Created sample client:", client1.name);
  console.log("\n🎉 Database seeded successfully!");
  console.log("\nLogin credentials:");
  console.log("  Email:    admin@i3media.co.uk");
  console.log("  Password: admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
