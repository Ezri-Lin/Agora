import { ipcMain } from "electron";
import { join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { assertInWorkspace } from "./safety.js";
import { auditLog } from "./audit.js";
import { assertSenderIsMain } from "./sender.js";

interface CustomRole {
  id: string;
  name: string;
  nameCN: string;
  subtitle: string;
  type: "critic" | "historian" | "strategist" | "lens" | "architect";
  systemPrompt: string;
  tags: string[];
}

function rolesFile(workspaceRoot: string): string {
  return join(workspaceRoot, ".agora", "roles", "custom-roles.json");
}

async function loadCustomRoles(workspaceRoot: string): Promise<CustomRole[]> {
  const file = rolesFile(workspaceRoot);
  if (!existsSync(file)) return [];
  try {
    return JSON.parse(await readFile(file, "utf-8"));
  } catch {
    return [];
  }
}

async function saveCustomRoles(workspaceRoot: string, roles: CustomRole[]): Promise<void> {
  const file = rolesFile(workspaceRoot);
  const dir = join(workspaceRoot, ".agora", "roles");
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(file, JSON.stringify(roles, null, 2));
}

export function registerCustomRoleHandlers(): void {
  ipcMain.handle("customRoles:list", async (_e: any, workspaceRoot: string) => {
    assertInWorkspace(workspaceRoot, workspaceRoot);
    return loadCustomRoles(workspaceRoot);
  });

  ipcMain.handle("customRoles:save", async (_e: any, workspaceRoot: string, role: CustomRole) => {
    assertSenderIsMain(_e);
    assertInWorkspace(workspaceRoot, workspaceRoot);
    const roles = await loadCustomRoles(workspaceRoot);
    const idx = roles.findIndex((r) => r.id === role.id);
    if (idx >= 0) {
      roles[idx] = role;
    } else {
      roles.push(role);
    }
    await saveCustomRoles(workspaceRoot, roles);
    auditLog("customRoles:save", { target: workspaceRoot, detail: role.id });
    return roles;
  });

  ipcMain.handle("customRoles:delete", async (_e: any, workspaceRoot: string, roleId: string) => {
    assertSenderIsMain(_e);
    assertInWorkspace(workspaceRoot, workspaceRoot);
    const roles = await loadCustomRoles(workspaceRoot);
    const filtered = roles.filter((r) => r.id !== roleId);
    await saveCustomRoles(workspaceRoot, filtered);
    auditLog("customRoles:delete", { target: workspaceRoot, detail: roleId });
    return filtered;
  });
}
