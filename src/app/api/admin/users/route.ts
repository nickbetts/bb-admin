import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

async function requireUsersPermission() {
  const session = await getSession();
  if (!session) return null;
  if (!session.user.permissions.includes("users")) return null;
  return session;
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  mustChangePassword: true,
  createdAt: true,
  roleId: true,
  userRole: { select: { id: true, name: true } },
} as const;

export async function GET() {
  const session = await requireUsersPermission();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: userSelect,
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const session = await requireUsersPermission();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, name, password, roleId } = await request.json() as {
    email?: string;
    name?: string;
    password?: string;
    roleId?: string;
  };

  if (!email || !name || !password) {
    return NextResponse.json({ error: "email, name and password are required" }, { status: 400 });
  }
  if (!roleId) {
    return NextResponse.json({ error: "roleId is required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
  }

  const roleRecord = await prisma.role.findUnique({ where: { id: roleId } });
  if (!roleRecord) {
    return NextResponse.json({ error: "Role not found" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: name.trim(),
      password: hash,
      roleId,
      mustChangePassword: true,
    },
    select: userSelect,
  });

  logActivity({
    userId: session.user.id,
    userEmail: session.user.email,
    userName: session.user.name ?? undefined,
    action: "user_created",
    resourceType: "user",
    resourceId: user.id,
    description: `Created user ${user.name} (${user.email})`,
  });

  return NextResponse.json(user, { status: 201 });
}
