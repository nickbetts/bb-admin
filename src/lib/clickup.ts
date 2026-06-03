import { prisma } from "@/lib/prisma";

const CLICKUP_BASE = "https://api.clickup.com/api/v2";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClickUpTeam {
  id: string;
  name: string;
}

interface ClickUpGroup {
  id: string;
  name: string;
  members: ClickUpMember[];
}

interface ClickUpSpace {
  id: string;
  name: string;
}

interface ClickUpFolder {
  id: string;
  name: string;
}

interface ClickUpListStatus {
  status: string;
  color?: string;
  type?: string;
  orderindex?: number;
}

interface ClickUpList {
  id: string;
  name: string;
  status?: ClickUpListStatus | { status: string };
  statuses?: ClickUpListStatus[];
}

interface ClickUpMember {
  user: {
    id: number;
    username: string | null;
    email: string;
    profilePicture: string | null;
  };
}

interface ClickUpTask {
  id: string;
  url: string;
}

interface ClickUpCustomFieldOption {
  id?: string;
  name?: string;
  orderindex?: string | number;
}

interface ClickUpCustomField {
  name?: string;
  type?: string;
  value?: unknown;
  type_config?: {
    options?: ClickUpCustomFieldOption[];
  };
}

interface ClickUpListTask {
  id: string;
  name: string;
  custom_fields?: ClickUpCustomField[];
}

interface ClickUpViewTasksResponse {
  tasks?: ClickUpListTask[];
}

interface ClickUpTimeEntry {
  duration?: number | string;
  time?: number | string;
}

interface ClickUpTimeEntriesResponse {
  data?: ClickUpTimeEntry[];
  entries?: ClickUpTimeEntry[];
}

interface ClickUpTeamWithMembers {
  id: string;
  members?: ClickUpMember[];
}

type PrescribedHoursSource = "custom_field" | "task_name";

export interface ClickUpTimeCheckerRow {
  clientName: string;
  prescribedHours: number;
  trackedHours: number;
  remainingHours: number;
  utilisationPct: number | null;
  folderId: string | null;
  folderName: string | null;
  folderMatchScore: number | null;
  prescribedHoursSource: PrescribedHoursSource;
  notes: string[];
}

export interface ClickUpTimeCheckerSummary {
  prescribedHoursTotal: number;
  trackedHoursTotal: number;
  remainingHoursTotal: number;
  overBudgetClients: number;
  underBudgetClients: number;
  unmatchedClients: number;
}

export interface ClickUpTimeCheckerReport {
  workspaceId: string;
  allocationListId: string;
  month: string;
  startDateMs: number;
  endDateMs: number;
  rows: ClickUpTimeCheckerRow[];
  summary: ClickUpTimeCheckerSummary;
  warnings: string[];
}

interface ClickUpChecklist {
  checklist: { id: string };
}

interface ClickUpTaskStatus {
  status?: string;
}

interface ClickUpChecklistItemDetail {
  resolved?: boolean;
  checked?: boolean;
}

interface ClickUpChecklistDetail {
  items?: ClickUpChecklistItemDetail[];
}

export interface ClickUpTaskDetail {
  id: string;
  url: string;
  status?: ClickUpTaskStatus;
  checklists?: ClickUpChecklistDetail[];
  archived?: boolean;
}

interface ClickUpCommentUser {
  id?: number | string;
  username?: string | null;
  email?: string | null;
  profilePicture?: string | null;
}

interface ClickUpComment {
  id?: string | number;
  comment_text?: string | null;
  comment?: string | null;
  date?: string | number | null;
  date_created?: string | number | null;
  user?: ClickUpCommentUser | null;
}

interface ClickUpTaskCommentsResponse {
  comments?: ClickUpComment[];
}

export interface ClickUpTaskComment {
  id: string;
  text: string;
  createdAt: string | null;
  user: {
    id: string | null;
    username: string | null;
    email: string | null;
    profilePicture: string | null;
  } | null;
}

interface UpdateClickUpTaskInput {
  status?: string;
}

function normaliseClickUpTimestamp(raw: string | number | null | undefined): string | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return new Date(raw).toISOString();
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const asNumber = Number.parseInt(trimmed, 10);
    if (Number.isFinite(asNumber) && String(asNumber) === trimmed) {
      return new Date(asNumber).toISOString();
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}

function mapClickUpTaskComment(comment: ClickUpComment): ClickUpTaskComment | null {
  const text =
    typeof comment.comment_text === "string"
      ? comment.comment_text.trim()
      : typeof comment.comment === "string"
        ? comment.comment.trim()
        : "";

  if (!text) return null;

  return {
    id: String(
      comment.id ??
        `${comment.user?.id ?? "unknown"}-${comment.date ?? comment.date_created ?? Date.now()}`,
    ),
    text,
    createdAt: normaliseClickUpTimestamp(comment.date_created ?? comment.date),
    user: comment.user
      ? {
          id: comment.user.id != null ? String(comment.user.id) : null,
          username: comment.user.username ?? null,
          email: comment.user.email ?? null,
          profilePicture: comment.user.profilePicture ?? null,
        }
      : null,
  };
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
 * Returns available statuses for a ClickUp list.
 */
export async function getClickUpListStatuses(listId: string): Promise<string[]> {
  try {
    const token = await getClickUpToken();
    const list = await clickupFetch<ClickUpList>(`/list/${listId}`, token);
    // Extract status names from the statuses array
    const statuses = list.statuses ?? [];
    return statuses
      .map((s) => s.status)
      .filter((s): s is string => typeof s === "string" && s.length > 0);
  } catch (error) {
    console.error(`Failed to fetch ClickUp list ${listId} statuses:`, error);
    return [];
  }
}

/**
 * Returns all members of every team the token has access to, deduplicated by user id.
 * Members are returned inline in the GET /team response (ClickUp v2).
 */
export async function getClickUpMembers(): Promise<
  Array<{ id: number; username: string; email: string; profilePicture: string | null }>
> {
  const token = await getClickUpToken();

  const { teams } = await clickupFetch<{
    teams: Array<{ id: string; members?: ClickUpMember[] }>;
  }>("/team", token);

  const seen = new Set<number>();
  const members: Array<{
    id: number;
    username: string;
    email: string;
    profilePicture: string | null;
  }> = [];

  for (const team of teams ?? []) {
    for (const m of team.members ?? []) {
      if (m?.user && !seen.has(m.user.id)) {
        seen.add(m.user.id);
        members.push({
          id: m.user.id,
          username: m.user.username ?? m.user.email ?? String(m.user.id),
          email: m.user.email ?? "",
          profilePicture: m.user.profilePicture ?? null,
        });
      }
    }
  }

  return members.sort((a, b) => a.username.localeCompare(b.username));
}

/**
 * Returns all user groups (teams) in the workspace, with their member IDs.
 * Uses GET /group?team_id={id} (ClickUp v2).
 */
export async function getClickUpGroups(): Promise<
  Array<{ id: string; name: string; memberIds: number[] }>
> {
  const token = await getClickUpToken();
  const { teams } = await clickupFetch<{ teams: Array<{ id: string }> }>("/team", token);

  const groups: Array<{ id: string; name: string; memberIds: number[] }> = [];

  for (const team of teams ?? []) {
    try {
      const { groups: teamGroups } = await clickupFetch<{ groups: ClickUpGroup[] }>(
        `/group?team_id=${team.id}`,
        token,
      );
      for (const g of teamGroups ?? []) {
        groups.push({
          id: g.id,
          name: g.name,
          memberIds: (g.members ?? []).map((m) => m.user.id),
        });
      }
    } catch {
      // Workspace may have no groups configured
    }
  }

  return groups.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Creates a task in the given list, then attaches a checklist with the
 * supplied items. Returns the new task ID and its ClickUp URL.
 */
export async function createClickUpTaskWithChecklist(
  listId: string,
  taskName: string,
  checklistItems: string[],
  assignees?: number[],
  dueDateMs?: number,
  description?: string,
  checklistName = "Go-Live Checklist",
  dueDateHasTime = false,
): Promise<{ taskId: string; taskUrl: string }> {
  const token = await getClickUpToken();

  // 1. Create the task
  const task = await clickupFetch<ClickUpTask>(`/list/${listId}/task`, token, {
    method: "POST",
    body: JSON.stringify({
      name: taskName,
      ...(description ? { markdown_description: description } : {}),
      ...(assignees && assignees.length > 0 ? { assignees } : {}),
      ...(dueDateMs ? { due_date: dueDateMs, due_date_time: dueDateHasTime } : {}),
    }),
  });

  // 2. Create the checklist on the task
  const { checklist } = await clickupFetch<ClickUpChecklist>(`/task/${task.id}/checklist`, token, {
    method: "POST",
    body: JSON.stringify({ name: checklistName }),
  });

  // 3. Add each item sequentially (ClickUp doesn't offer a bulk endpoint)
  for (const item of checklistItems) {
    await clickupFetch(`/checklist/${checklist.id}/checklist_item`, token, {
      method: "POST",
      body: JSON.stringify({ name: item }),
    });
  }

  return { taskId: task.id, taskUrl: task.url };
}

/**
 * Reads a single ClickUp task with checklist/state metadata.
 */
export async function getClickUpTask(taskId: string): Promise<ClickUpTaskDetail> {
  const token = await getClickUpToken();
  return clickupFetch<ClickUpTaskDetail>(`/task/${taskId}`, token);
}

/**
 * Updates supported mutable fields on a ClickUp task.
 */
export async function updateClickUpTask(
  taskId: string,
  input: UpdateClickUpTaskInput,
): Promise<ClickUpTaskDetail> {
  const token = await getClickUpToken();
  return clickupFetch<ClickUpTaskDetail>(`/task/${taskId}`, token, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/**
 * Convenience helper to update only the task status.
 */
export async function updateClickUpTaskStatus(
  taskId: string,
  status: string,
): Promise<ClickUpTaskDetail> {
  return updateClickUpTask(taskId, { status });
}

export async function getClickUpTaskComments(taskId: string): Promise<ClickUpTaskComment[]> {
  const token = await getClickUpToken();
  const response = await clickupFetch<ClickUpTaskCommentsResponse>(
    `/task/${taskId}/comment`,
    token,
  );
  return (response.comments ?? [])
    .map(mapClickUpTaskComment)
    .filter((comment): comment is ClickUpTaskComment => comment !== null);
}

export async function createClickUpTaskComment(input: {
  taskId: string;
  commentText: string;
  notifyAll?: boolean;
}): Promise<ClickUpTaskComment> {
  const token = await getClickUpToken();
  const response = await clickupFetch<ClickUpComment>(`/task/${input.taskId}/comment`, token, {
    method: "POST",
    body: JSON.stringify({
      comment_text: input.commentText,
      notify_all: input.notifyAll ?? false,
    }),
  });

  const mapped = mapClickUpTaskComment(response);
  if (!mapped) {
    throw new Error("ClickUp comment response was empty");
  }

  return mapped;
}

const HOURS_FIELD_HINT_REGEX = /(hour|hrs?|allocated|prescribed|retainer|contracted)/i;
const HOURS_IN_TEXT_REGEX = /(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i;

function roundHours(value: number): number {
  return Number.parseFloat(value.toFixed(2));
}

function parsePositiveNumber(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }

  if (typeof raw === "string") {
    const match = raw.replace(/,/g, ".").match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const parsed = Number.parseFloat(match[0]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function extractDropdownOptionText(field: ClickUpCustomField): string | null {
  const options = field.type_config?.options ?? [];
  if (!Array.isArray(options) || options.length === 0 || field.value === undefined) return null;

  const valueAsString = String(field.value);
  const byId = options.find((option) => String(option.id) === valueAsString);
  if (byId?.name) return byId.name;

  const numericValue = Number.parseInt(valueAsString, 10);
  if (Number.isFinite(numericValue)) {
    const byOrder = options.find((option) => {
      const order = Number.parseInt(String(option.orderindex ?? ""), 10);
      return Number.isFinite(order) && order === numericValue;
    });
    if (byOrder?.name) return byOrder.name;
  }

  return null;
}

function parseHoursFromCustomField(field: ClickUpCustomField): number | null {
  const directValue = parsePositiveNumber(field.value);
  if (directValue !== null) return directValue;

  if (field.type === "drop_down") {
    const optionText = extractDropdownOptionText(field);
    if (optionText) {
      return parsePositiveNumber(optionText);
    }
  }

  return null;
}

function cleanClientName(raw: string): string {
  return raw
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/gi, "")
    .replace(/[-|:\u2013\u2014]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseEntityName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(ltd|limited|llp|uk|co)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreNameMatch(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;

  const aTokens = new Set(a.split(" ").filter(Boolean));
  const bTokens = new Set(b.split(" ").filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }

  return overlap / Math.max(aTokens.size, bTokens.size);
}

function getMatchConfidence(score: number): "high" | "medium" | "low" | "none" {
  if (score >= 0.9) return "high";
  if (score >= 0.7) return "medium";
  if (score >= 0.5) return "low";
  return "none";
}

function parseDurationMs(entry: ClickUpTimeEntry): number {
  const raw = entry.duration ?? entry.time;
  const parsed =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseFloat(raw) : Number.NaN;

  if (!Number.isFinite(parsed)) return 0;
  return Math.abs(parsed);
}

function isTimeEntryAccessError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message;
  return (
    message.includes("TIMEENTRY_059") ||
    message.includes("You have no access") ||
    message.toLowerCase().includes("time entry")
  );
}

function parsePrescribedHours(task: ClickUpListTask): {
  clientName: string;
  prescribedHours: number;
  source: PrescribedHoursSource;
} | null {
  const hourFields = (task.custom_fields ?? []).filter((field) =>
    HOURS_FIELD_HINT_REGEX.test(field.name ?? ""),
  );

  for (const field of hourFields) {
    const parsed = parseHoursFromCustomField(field);
    if (parsed !== null) {
      return {
        clientName: cleanClientName(task.name) || task.name.trim(),
        prescribedHours: parsed,
        source: "custom_field",
      };
    }
  }

  const titleMatch = HOURS_IN_TEXT_REGEX.exec(task.name);
  if (titleMatch) {
    const parsed = parsePositiveNumber(titleMatch[1]);
    if (parsed !== null) {
      return {
        clientName: cleanClientName(task.name) || task.name.trim(),
        prescribedHours: parsed,
        source: "task_name",
      };
    }
  }

  return null;
}

async function getClickUpListTasks(listId: string, token: string): Promise<ClickUpListTask[]> {
  const tasks: ClickUpListTask[] = [];

  for (let page = 0; page < 40; page += 1) {
    const path = `/list/${listId}/task?archived=false&include_closed=true&page=${page}`;
    const response = await clickupFetch<{ tasks?: ClickUpListTask[] }>(path, token);
    const pageTasks = Array.isArray(response.tasks) ? response.tasks : [];

    if (pageTasks.length === 0) break;
    tasks.push(...pageTasks);

    if (pageTasks.length < 100) break;
  }

  return tasks;
}

type TimeEntryScope = "workspace" | "current_user";

async function fetchTrackedHoursForFolder(params: {
  token: string;
  teamId: string;
  folderId: string;
  startDateMs: number;
  endDateMs: number;
  assigneeIds: number[];
  includeAssigneeFilter: boolean;
}): Promise<number> {
  const search = new URLSearchParams({
    start_date: String(params.startDateMs),
    end_date: String(params.endDateMs),
    folder_id: params.folderId,
    include_location_names: "true",
  });

  if (params.includeAssigneeFilter && params.assigneeIds.length > 0) {
    search.set("assignee", params.assigneeIds.join(","));
  }

  const response = await clickupFetch<ClickUpTimeEntriesResponse>(
    `/team/${params.teamId}/time_entries?${search.toString()}`,
    params.token,
  );

  const entries = Array.isArray(response.data)
    ? response.data
    : Array.isArray(response.entries)
      ? response.entries
      : [];

  const totalMs = entries.reduce((sum, entry) => sum + parseDurationMs(entry), 0);
  return roundHours(totalMs / (1000 * 60 * 60));
}

async function getTrackedHoursForFolder(params: {
  token: string;
  teamId: string;
  folderId: string;
  startDateMs: number;
  endDateMs: number;
  assigneeIds: number[];
}): Promise<{ hours: number; scope: TimeEntryScope }> {
  if (params.assigneeIds.length === 0) {
    const hours = await fetchTrackedHoursForFolder({
      ...params,
      includeAssigneeFilter: false,
    });
    return { hours, scope: "current_user" };
  }

  try {
    const hours = await fetchTrackedHoursForFolder({
      ...params,
      includeAssigneeFilter: true,
    });
    return { hours, scope: "workspace" };
  } catch (error) {
    if (!isTimeEntryAccessError(error)) {
      throw error;
    }

    try {
      const hours = await fetchTrackedHoursForFolder({
        ...params,
        includeAssigneeFilter: false,
      });
      return { hours, scope: "current_user" };
    } catch (fallbackError) {
      if (isTimeEntryAccessError(fallbackError)) {
        throw new Error(
          "ClickUp token cannot access time entries for this folder. Use a Workspace Owner/Admin token with access to this folder.",
        );
      }
      throw fallbackError;
    }
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

export async function getClickUpTimeCheckerReport(input: {
  allocationListIdCandidates: string[];
  allocationViewIdCandidates?: string[];
  clientFolderIdCandidates?: string[];
  month: string;
  startDateMs: number;
  endDateMs: number;
}): Promise<ClickUpTimeCheckerReport> {
  const token = await getClickUpToken();

  const { teams } = await clickupFetch<{ teams: ClickUpTeamWithMembers[] }>("/team", token);
  if (!Array.isArray(teams) || teams.length === 0) {
    throw new Error("No ClickUp workspace found for the configured token.");
  }

  const workspaceId = teams[0].id;
  const assigneeIds = Array.from(
    new Set(
      teams
        .flatMap((team) => team.members ?? [])
        .map((member) => member.user.id)
        .filter((id) => Number.isFinite(id)),
    ),
  );

  const candidateIds = Array.from(
    new Set(
      input.allocationListIdCandidates
        .map((value) => value.trim())
        .filter((value) => /^\d{6,}$/.test(value)),
    ),
  );

  const candidateViewIds = Array.from(
    new Set(
      (input.allocationViewIdCandidates ?? [])
        .map((value) => value.trim())
        .filter((value) => /^[a-z0-9_-]{4,}$/i.test(value) && !/^\d+$/.test(value)),
    ),
  );

  if (candidateIds.length === 0 && candidateViewIds.length === 0) {
    throw new Error("No valid allocation list/view references were provided.");
  }

  let allocationListId: string | null = null;
  let allocationTasks: ClickUpListTask[] = [];
  let allocationSource: "list" | "view" = "list";
  let lastListError: Error | null = null;

  for (const candidateId of candidateIds) {
    try {
      const tasks = await getClickUpListTasks(candidateId, token);
      allocationListId = candidateId;
      allocationTasks = tasks;
      allocationSource = "list";
      break;
    } catch (error) {
      lastListError = error instanceof Error ? error : new Error("Unknown ClickUp list error");
    }
  }

  async function getClickUpViewTasks(viewId: string): Promise<ClickUpListTask[]> {
    const tasks: ClickUpListTask[] = [];

    for (let page = 0; page < 40; page += 1) {
      const response = await clickupFetch<ClickUpViewTasksResponse>(
        `/view/${encodeURIComponent(viewId)}/task?page=${page}&include_closed=true`,
        token,
      );
      const pageTasks = Array.isArray(response.tasks) ? response.tasks : [];

      if (pageTasks.length === 0) break;
      tasks.push(...pageTasks);

      if (pageTasks.length < 100) break;
    }

    return tasks;
  }

  if (!allocationListId) {
    for (const candidateViewId of candidateViewIds) {
      try {
        const tasks = await getClickUpViewTasks(candidateViewId);
        allocationListId = candidateViewId;
        allocationTasks = tasks;
        allocationSource = "view";
        break;
      } catch (error) {
        lastListError =
          error instanceof Error ? error : new Error("Unknown ClickUp view lookup error");
      }
    }
  }

  if (!allocationListId) {
    const attemptedListIds = candidateIds.length > 0 ? `list IDs: ${candidateIds.join(", ")}` : "";
    const attemptedViewIds =
      candidateViewIds.length > 0 ? `view IDs: ${candidateViewIds.join(", ")}` : "";
    const attempted = [attemptedListIds, attemptedViewIds].filter(Boolean).join("; ");
    const reason = lastListError?.message ? ` (${lastListError.message})` : "";
    throw new Error(`Could not load the prescribed-hours list. Tried: ${attempted}${reason}`);
  }

  const allocationByClient = new Map<
    string,
    { clientName: string; prescribedHours: number; source: PrescribedHoursSource }
  >();

  for (const task of allocationTasks) {
    const parsed = parsePrescribedHours(task);
    if (!parsed) continue;

    const key = normaliseEntityName(parsed.clientName);
    if (!key) continue;

    const existing = allocationByClient.get(key);
    if (!existing) {
      allocationByClient.set(key, {
        clientName: parsed.clientName,
        prescribedHours: parsed.prescribedHours,
        source: parsed.source,
      });
      continue;
    }

    existing.prescribedHours = roundHours(existing.prescribedHours + parsed.prescribedHours);
    if (existing.source !== "custom_field" && parsed.source === "custom_field") {
      existing.source = "custom_field";
    }
    if (parsed.clientName.length > existing.clientName.length) {
      existing.clientName = parsed.clientName;
    }
  }

  const allocations = Array.from(allocationByClient.values());

  if (allocations.length === 0) {
    throw new Error(
      "No prescribed hours were found in the allocation list. Add an hours custom field or include values such as '18h' in task titles.",
    );
  }

  const folders = await getClickUpFolders();
  const preparedFolders = folders.map((folder) => ({
    ...folder,
    normalisedName: normaliseEntityName(folder.name),
  }));

  const folderCandidates = Array.from(
    new Set(
      (input.clientFolderIdCandidates ?? [])
        .map((value) => value.trim())
        .filter((value) => /^\d{6,}$/.test(value)),
    ),
  );

  const targetFolder =
    folderCandidates.length > 0
      ? (preparedFolders.find((folder) => folderCandidates.includes(folder.id)) ?? null)
      : null;

  if (folderCandidates.length > 0 && !targetFolder) {
    throw new Error(
      `Could not find the provided client folder in ClickUp. Tried folder IDs: ${folderCandidates.join(", ")}`,
    );
  }

  interface MatchedAllocationRow {
    clientName: string;
    prescribedHours: number;
    source: PrescribedHoursSource;
    matchConfidence: "high" | "medium" | "low" | "none";
    matchScore: number;
    folderId: string | null;
    folderName: string | null;
    forcedFolderMatch?: boolean;
  }

  const matchedRows: MatchedAllocationRow[] = (() => {
    if (targetFolder) {
      let bestAllocation = allocations[0];
      let bestScore = scoreNameMatch(
        normaliseEntityName(allocations[0].clientName),
        targetFolder.normalisedName,
      );

      for (const allocation of allocations.slice(1)) {
        const score = scoreNameMatch(
          normaliseEntityName(allocation.clientName),
          targetFolder.normalisedName,
        );
        if (score > bestScore) {
          bestScore = score;
          bestAllocation = allocation;
        }
      }

      return [
        {
          ...bestAllocation,
          matchConfidence: getMatchConfidence(bestScore),
          matchScore: bestScore,
          folderId: targetFolder.id,
          folderName: targetFolder.name,
          forcedFolderMatch: true,
        },
      ];
    }

    return allocations.map((allocation) => {
      const normalisedClient = normaliseEntityName(allocation.clientName);
      let bestFolder: (typeof preparedFolders)[number] | null = null;
      let bestScore = 0;

      for (const folder of preparedFolders) {
        const score = scoreNameMatch(normalisedClient, folder.normalisedName);
        if (score > bestScore) {
          bestScore = score;
          bestFolder = folder;
        }
      }

      const confidence = getMatchConfidence(bestScore);

      return {
        ...allocation,
        matchConfidence: confidence,
        matchScore: bestScore,
        folderId: confidence === "none" ? null : (bestFolder?.id ?? null),
        folderName: confidence === "none" ? null : (bestFolder?.name ?? null),
      };
    });
  })();

  const matchedFolderIds = Array.from(
    new Set(matchedRows.map((row) => row.folderId).filter((id): id is string => Boolean(id))),
  );

  const trackedByFolderId = new Map<string, number>();
  const trackedScopeByFolderId = new Map<string, TimeEntryScope>();

  await mapWithConcurrency(matchedFolderIds, 4, async (folderId) => {
    const tracked = await getTrackedHoursForFolder({
      token,
      teamId: workspaceId,
      folderId,
      startDateMs: input.startDateMs,
      endDateMs: input.endDateMs,
      assigneeIds,
    });
    trackedByFolderId.set(folderId, tracked.hours);
    trackedScopeByFolderId.set(folderId, tracked.scope);
    return tracked;
  });

  const rows: ClickUpTimeCheckerRow[] = matchedRows
    .map((row) => {
      const trackedHours = row.folderId ? (trackedByFolderId.get(row.folderId) ?? 0) : 0;
      const remainingHours = roundHours(row.prescribedHours - trackedHours);
      const utilisationPct =
        row.prescribedHours > 0 ? roundHours((trackedHours / row.prescribedHours) * 100) : null;

      const notes: string[] = [];
      if (row.source === "task_name") {
        notes.push("Prescribed hours inferred from task title text.");
      }
      if (row.forcedFolderMatch && row.matchConfidence === "none") {
        notes.push("Folder was explicitly provided and mapped with low name confidence.");
      }
      if (!row.folderId) {
        notes.push("No matching client folder found.");
      }

      return {
        clientName: row.clientName,
        prescribedHours: row.prescribedHours,
        trackedHours,
        remainingHours,
        utilisationPct,
        folderId: row.folderId,
        folderName: row.folderName,
        folderMatchScore: row.folderId ? roundHours(row.matchScore) : null,
        prescribedHoursSource: row.source,
        notes,
      };
    })
    .sort((a, b) => a.remainingHours - b.remainingHours);

  const prescribedHoursTotal = roundHours(rows.reduce((sum, row) => sum + row.prescribedHours, 0));
  const trackedHoursTotal = roundHours(rows.reduce((sum, row) => sum + row.trackedHours, 0));
  const remainingHoursTotal = roundHours(rows.reduce((sum, row) => sum + row.remainingHours, 0));

  const summary: ClickUpTimeCheckerSummary = {
    prescribedHoursTotal,
    trackedHoursTotal,
    remainingHoursTotal,
    overBudgetClients: rows.filter((row) => row.remainingHours < 0).length,
    underBudgetClients: rows.filter((row) => row.remainingHours >= 0 && row.folderId).length,
    unmatchedClients: rows.filter((row) => !row.folderId).length,
  };

  const warnings: string[] = [];
  if (teams.length > 1) {
    warnings.push(
      "Multiple ClickUp workspaces were detected. Time entries are currently queried from the first workspace only.",
    );
  }
  if (targetFolder) {
    warnings.push(
      "Single-folder mode is active. Results are limited to the provided client folder URL.",
    );
  }
  if (rows.some((row) => row.prescribedHoursSource === "task_name")) {
    warnings.push(
      "Some prescribed hours were inferred from task titles. For best accuracy, store prescribed hours in a numeric custom field.",
    );
  }
  if (Array.from(trackedScopeByFolderId.values()).includes("current_user")) {
    warnings.push(
      "Time entries are limited to the authenticated ClickUp user. Use a Workspace Owner/Admin token to include all users.",
    );
  }

  return {
    workspaceId,
    allocationListId: allocationSource === "view" ? `view:${allocationListId}` : allocationListId,
    month: input.month,
    startDateMs: input.startDateMs,
    endDateMs: input.endDateMs,
    rows,
    summary,
    warnings,
  };
}
