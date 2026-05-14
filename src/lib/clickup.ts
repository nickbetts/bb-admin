import { prisma } from "@/lib/prisma";

const CLICKUP_BASE = "https://api.clickup.com/api/v2";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClickUpTeam {
  id: string;
  name: string;
}

interface ClickUpSpace {
  id: string;
  name: string;
}

interface ClickUpFolder {
  id: string;
  name: string;
}

interface ClickUpList {
  id: string;
  name: string;
  status?: { status: string };
}

interface ClickUpMember {
  user: {
    id: number;
    username: string;
    email: string;
    profilePicture: string | null;
  };
}

interface ClickUpTask {
  id: string;
  url: string;
}

interface ClickUpChecklist {
  checklist: { id: string };
}

// ─── Token resolution ─────────────────────────────────────────────────────────

export async function getClickUpToken(): Promise<string> {
  const setting = await prisma.appSetting.findUnique({ where: { key: "clickupApiToken" } });
  const token = setting?.value;
  if (!token) {
    throw new Error(
      "ClickUp API token not configured. Please add it in Settings → ClickUp Integration.",
    );
  }
  return token;
}

// ─── Internal fetch helper ────────────────────────────────────────────────────

async function clickupFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${CLICKUP_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ClickUp API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Returns all folders across every space in every team the token has access to.
 * Each folder includes the parent space name for display purposes.
 */
export async function getClickUpFolders(): Promise<
  Array<{ id: string; name: string; spaceName: string }>
> {
  const token = await getClickUpToken();

  // 1. Teams
  const { teams } = await clickupFetch<{ teams: ClickUpTeam[] }>("/team", token);

  const folders: Array<{ id: string; name: string; spaceName: string }> = [];

  for (const team of teams) {
    // 2. Spaces per team
    const { spaces } = await clickupFetch<{ spaces: ClickUpSpace[] }>(
      `/team/${team.id}/space?archived=false`,
      token,
    );

    for (const space of spaces) {
      // 3. Folders per space
      const { folders: spaceFolders } = await clickupFetch<{ folders: ClickUpFolder[] }>(
        `/space/${space.id}/folder?archived=false`,
        token,
      );

      for (const folder of spaceFolders) {
        folders.push({ id: folder.id, name: folder.name, spaceName: space.name });
      }
    }
  }

  return folders;
}

/**
 * Returns all lists within a given folder.
 */
export async function getClickUpLists(
  folderId: string,
): Promise<Array<{ id: string; name: string }>> {
  const token = await getClickUpToken();
  const { lists } = await clickupFetch<{ lists: ClickUpList[] }>(
    `/folder/${folderId}/list?archived=false`,
    token,
  );
  return lists.map((l) => ({ id: l.id, name: l.name }));
}

/**
 * Returns all members of every team the token has access to, deduplicated by user id.
 * Uses the dedicated /team/{id}/member endpoint for reliability.
 */
export async function getClickUpMembers(): Promise<
  Array<{ id: number; username: string; email: string; profilePicture: string | null }>
> {
  const token = await getClickUpToken();
  const { teams } = await clickupFetch<{ teams: Array<{ id: string }> }>("/team", token);

  const seen = new Set<number>();
  const members: Array<{ id: number; username: string; email: string; profilePicture: string | null }> = [];

  for (const team of teams) {
    try {
      const { members: teamMembers } = await clickupFetch<{ members: ClickUpMember[] }>(
        `/team/${team.id}/member`,
        token,
      );
      for (const m of teamMembers ?? []) {
        if (!seen.has(m.user.id)) {
          seen.add(m.user.id);
          members.push({
            id: m.user.id,
            username: m.user.username,
            email: m.user.email,
            profilePicture: m.user.profilePicture,
          });
        }
      }
    } catch {
      // Skip teams we can't read members from
    }
  }

  return members.sort((a, b) => a.username.localeCompare(b.username));
}

/**
 * Creates a task in the given list, then attaches a "Go-Live Checklist" with
 * the supplied items. Returns the new task ID and its ClickUp URL.
 */
export async function createClickUpTaskWithChecklist(
  listId: string,
  taskName: string,
  checklistItems: string[],
  assignees?: number[],
  dueDateMs?: number,
): Promise<{ taskId: string; taskUrl: string }> {
  const token = await getClickUpToken();

  // 1. Create the task
  const task = await clickupFetch<ClickUpTask>(
    `/list/${listId}/task`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        name: taskName,
        ...(assignees && assignees.length > 0 ? { assignees } : {}),
        ...(dueDateMs ? { due_date: dueDateMs, due_date_time: false } : {}),
      }),
    },
  );

  // 2. Create the checklist on the task
  const { checklist } = await clickupFetch<ClickUpChecklist>(
    `/task/${task.id}/checklist`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ name: "Go-Live Checklist" }),
    },
  );

  // 3. Add each item sequentially (ClickUp doesn't offer a bulk endpoint)
  for (const item of checklistItems) {
    await clickupFetch(
      `/checklist/${checklist.id}/checklist_item`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ name: item }),
      },
    );
  }

  return { taskId: task.id, taskUrl: task.url };
}
