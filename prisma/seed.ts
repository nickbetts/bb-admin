import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@i3media.net" },
    update: {},
    create: {
      email: "admin@i3media.net",
      name: "Admin",
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("✅ Created admin user:", admin.email);

  // Primary admin account — update role only if already exists (don't reset password)
  const nickHashedPassword = await bcrypt.hash("Guneti250!", 12);
  const nick = await prisma.user.upsert({
    where: { email: "nick@i3media.net" },
    update: { role: "admin" },
    create: {
      email: "nick@i3media.net",
      name: "Nick Betts",
      password: nickHashedPassword,
      role: "admin",
      mustChangePassword: false,
    },
  });

  console.log("✅ Created/updated admin user:", nick.email);

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

  // Default task categories (kanban boards). Idempotent via stable IDs + upsert.
  const defaultCategories = [
    {
      id: "tcat_paid_social",
      name: "Paid Social",
      slug: "paid-social",
      color: "#ec4899",
      icon: "Megaphone",
      sortOrder: 10,
    },
    {
      id: "tcat_content",
      name: "Content",
      slug: "content",
      color: "#8b5cf6",
      icon: "PenLine",
      sortOrder: 20,
    },
    {
      id: "tcat_outreach",
      name: "Outreach",
      slug: "outreach",
      color: "#0ea5e9",
      icon: "Send",
      sortOrder: 30,
    },
    {
      id: "tcat_technical",
      name: "Technical",
      slug: "technical",
      color: "#64748b",
      icon: "Wrench",
      sortOrder: 40,
    },
    {
      id: "tcat_paid_search",
      name: "Paid Search",
      slug: "paid-search",
      color: "#10b981",
      icon: "Search",
      sortOrder: 50,
    },
    {
      id: "tcat_email_marketing",
      name: "Email Marketing",
      slug: "email-marketing",
      color: "#f59e0b",
      icon: "Mail",
      sortOrder: 60,
    },
    {
      id: "tcat_reporting",
      name: "Reporting",
      slug: "reporting",
      color: "#6366f1",
      icon: "BarChart3",
      sortOrder: 70,
    },
  ];

  for (const c of defaultCategories) {
    await prisma.taskCategory.upsert({
      where: { id: c.id },
      update: { name: c.name, color: c.color, icon: c.icon, sortOrder: c.sortOrder },
      create: c,
    });
    await prisma.clientTaskCategory.upsert({
      where: { clientId_categoryId: { clientId: client1.id, categoryId: c.id } },
      update: { sortOrder: c.sortOrder, isEnabled: true },
      create: { clientId: client1.id, categoryId: c.id, sortOrder: c.sortOrder, isEnabled: true },
    });
  }
  console.log("✅ Seeded 7 default task categories and enabled for demo client");

  console.log("\n🎉 Database seeded successfully!");
  console.log("\nLogin credentials:");
  console.log("  Email:    admin@i3media.net");
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
