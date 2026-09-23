import { gameSpecSchema } from "./schema";
import type { ActionDef, GameSpec, SetupStep, ZoneRef } from "./types";

export interface ValidationIssue {
  level: "error" | "warning";
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  spec?: GameSpec;
}

function collectZoneRefs(value: unknown, out: ZoneRef[]): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectZoneRefs(item, out);
    return;
  }
  const obj = value as Record<string, unknown>;
  if (
    (typeof obj.zone === "string" && Object.keys(obj).every((k) => k === "zone" || k === "owner")) ||
    (Array.isArray(obj.anyOf) && Object.keys(obj).every((k) => k === "anyOf"))
  ) {
    out.push(obj as unknown as ZoneRef);
  }
  for (const key of Object.keys(obj)) {
    collectZoneRefs(obj[key], out);
  }
}

function collectEntityTypeRefs(value: unknown, out: string[]): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectEntityTypeRefs(item, out);
    return;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.entityType === "string") out.push(obj.entityType);
  for (const key of Object.keys(obj)) {
    collectEntityTypeRefs(obj[key], out);
  }
}

function zoneIdsOf(ref: ZoneRef): string[] {
  return "zone" in ref ? [ref.zone] : ref.anyOf;
}

/** Actions directly reachable from the given effects/conditions/setup step (used for zone/owner checks on action to/from). */
function checkZoneRefOwner(
  ref: ZoneRef | undefined,
  path: string,
  zoneById: Map<string, { owner: string }>,
  issues: ValidationIssue[],
): void {
  if (!ref) return;
  const ids = zoneIdsOf(ref);
  const owner = "owner" in ref ? ref.owner : undefined;
  for (const id of ids) {
    const zone = zoneById.get(id);
    if (zone && zone.owner === "player" && owner === undefined) {
      issues.push({
        level: "warning",
        path,
        message: `Zone "${id}" has owner "player" but is referenced without an owner qualifier.`,
      });
    }
  }
}

export function validateGameSpec(input: unknown): ValidationResult {
  const parsed = gameSpecSchema.safeParse(input);
  if (!parsed.success) {
    const issues: ValidationIssue[] = parsed.error.issues.map((issue) => ({
      level: "error",
      path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
      message: issue.message,
    }));
    return { ok: false, issues };
  }

  const spec = parsed.data as GameSpec;
  const issues: ValidationIssue[] = [];

  // ---- Unique ids -----------------------------------------------------
  const checkUnique = (items: { id: string }[], label: string) => {
    const seen = new Map<string, number>();
    items.forEach((item, i) => {
      seen.set(item.id, (seen.get(item.id) ?? 0) + 1);
      if (seen.get(item.id)! > 1) {
        issues.push({
          level: "error",
          path: `${label}[${i}].id`,
          message: `Duplicate ${label} id "${item.id}".`,
        });
      }
    });
  };
  checkUnique(spec.entityTypes, "entityTypes");
  checkUnique(spec.zones, "zones");
  checkUnique(spec.actions, "actions");
  checkUnique(spec.resources, "resources");
  checkUnique(spec.turnStructure.phases, "phases");
  checkUnique(spec.scoring, "scoring");

  const zoneById = new Map(spec.zones.map((z) => [z.id, z]));
  const entityTypeIds = new Set(spec.entityTypes.map((e) => e.id));
  const actionIds = new Set(spec.actions.map((a) => a.id));

  // ---- Zone references -------------------------------------------------
  const checkZoneRefsIn = (value: unknown, path: string) => {
    const refs: ZoneRef[] = [];
    collectZoneRefs(value, refs);
    for (const ref of refs) {
      for (const id of zoneIdsOf(ref)) {
        if (!zoneById.has(id)) {
          issues.push({
            level: "error",
            path,
            message: `Unknown zone id "${id}" referenced.`,
          });
        }
      }
    }
  };

  spec.setup.forEach((step: SetupStep, i: number) => checkZoneRefsIn(step, `setup[${i}]`));
  spec.actions.forEach((action: ActionDef, i: number) => {
    checkZoneRefsIn(action, `actions[${i}]`);
  });
  spec.turnStructure.phases.forEach((phase, i: number) => {
    checkZoneRefsIn(phase.endsWhen, `turnStructure.phases[${i}].endsWhen`);
  });
  spec.endConditions.forEach((ec, i: number) => {
    if (ec.type === "condition") {
      checkZoneRefsIn(ec.condition, `endConditions[${i}].condition`);
    }
  });

  // ---- Entity type references -------------------------------------------
  const checkEntityTypeRefsIn = (value: unknown, path: string) => {
    const refs: string[] = [];
    collectEntityTypeRefs(value, refs);
    for (const t of refs) {
      if (!entityTypeIds.has(t)) {
        issues.push({
          level: "error",
          path,
          message: `Unknown entity type "${t}" referenced.`,
        });
      }
    }
  };

  spec.setup.forEach((step: SetupStep, i: number) => checkEntityTypeRefsIn(step, `setup[${i}]`));
  spec.actions.forEach((action: ActionDef, i: number) => checkEntityTypeRefsIn(action, `actions[${i}]`));

  spec.zones.forEach((zone, i) => {
    if (zone.cellPattern) {
      zone.cellPattern.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell && !entityTypeIds.has(cell)) {
            issues.push({
              level: "error",
              path: `zones[${i}].cellPattern[${r}][${c}]`,
              message: `Unknown entity type "${cell}" in cellPattern.`,
            });
          }
        });
      });
    }
  });

  // ---- Phase actions reference known actions -----------------------------
  spec.turnStructure.phases.forEach((phase, i) => {
    phase.actions.forEach((actionId, j) => {
      if (!actionIds.has(actionId)) {
        issues.push({
          level: "error",
          path: `turnStructure.phases[${i}].actions[${j}]`,
          message: `Unknown action id "${actionId}" referenced by phase "${phase.id}".`,
        });
      }
    });
  });

  // ---- Every action reachable from at least one phase (warning) ---------
  const reachableActionIds = new Set<string>();
  spec.turnStructure.phases.forEach((phase) => {
    phase.actions.forEach((a) => reachableActionIds.add(a));
  });
  spec.actions.forEach((action, i) => {
    if (!reachableActionIds.has(action.id)) {
      issues.push({
        level: "warning",
        path: `actions[${i}]`,
        message: `Action "${action.id}" is not referenced by any phase and is unreachable.`,
      });
    }
  });

  // ---- players.min/max ---------------------------------------------------
  if (spec.players.min < 1) {
    issues.push({ level: "error", path: "players.min", message: "players.min must be >= 1." });
  }
  if (spec.players.min > spec.players.max) {
    issues.push({
      level: "error",
      path: "players",
      message: `players.min (${spec.players.min}) must be <= players.max (${spec.players.max}).`,
    });
  }

  // ---- zone geometry checks -----------------------------------------------
  spec.zones.forEach((zone, i) => {
    const g = zone.geometry;
    if (g.kind === "row" && g.capacity !== undefined && g.capacity < 1) {
      issues.push({
        level: "error",
        path: `zones[${i}].geometry.capacity`,
        message: `Row zone "${zone.id}" capacity must be >= 1.`,
      });
    }
    if (g.kind === "grid") {
      if (g.rows < 1) {
        issues.push({
          level: "error",
          path: `zones[${i}].geometry.rows`,
          message: `Grid zone "${zone.id}" rows must be >= 1.`,
        });
      }
      if (g.cols < 1) {
        issues.push({
          level: "error",
          path: `zones[${i}].geometry.cols`,
          message: `Grid zone "${zone.id}" cols must be >= 1.`,
        });
      }
      if (zone.cellPattern) {
        if (zone.cellPattern.length !== g.rows) {
          issues.push({
            level: "error",
            path: `zones[${i}].cellPattern`,
            message: `Zone "${zone.id}" cellPattern has ${zone.cellPattern.length} rows but grid.rows is ${g.rows}.`,
          });
        }
        zone.cellPattern.forEach((row, r) => {
          if (row.length !== g.cols) {
            issues.push({
              level: "error",
              path: `zones[${i}].cellPattern[${r}]`,
              message: `Zone "${zone.id}" cellPattern row ${r} has ${row.length} cols but grid.cols is ${g.cols}.`,
            });
          }
        });
      }
    }
  });

  // ---- owner "player" zone referenced without owner in action to/from ---
  spec.actions.forEach((action, i) => {
    checkZoneRefOwner(action.from, `actions[${i}].from`, zoneById, issues);
    checkZoneRefOwner(action.to, `actions[${i}].to`, zoneById, issues);
  });

  // ---- at least one endCondition / action --------------------------------
  if (spec.endConditions.length === 0) {
    issues.push({ level: "error", path: "endConditions", message: "At least one endCondition is required." });
  }
  if (spec.actions.length === 0) {
    issues.push({ level: "error", path: "actions", message: "At least one action is required." });
  }

  const ok = !issues.some((i) => i.level === "error");
  return { ok, issues, spec: ok ? spec : undefined };
}
