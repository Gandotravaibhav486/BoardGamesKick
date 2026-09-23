"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCompiler } from "@/lib/compiler/mock-compiler";
import { getGame, saveGame, slugify, type GameRecord } from "@/lib/store";
import type { CreateGameState } from "./form-state";

const createGameSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    pitch: z
      .string()
      .trim()
      .min(1, "Short pitch is required")
      .max(160, "Keep the pitch under 160 characters"),
    playersMin: z.coerce.number().int().min(1, "Minimum players must be at least 1").max(8),
    playersMax: z.coerce.number().int().min(1).max(8, "Maximum players can't exceed 8"),
    estimatedMinutes: z.coerce
      .number()
      .int()
      .min(5, "Play time must be at least 5 minutes")
      .max(240, "Play time must be 240 minutes or fewer"),
    rulesText: z
      .string()
      .trim()
      .min(40, "Describe the rules in at least 40 characters"),
  })
  .refine((data) => data.playersMin <= data.playersMax, {
    message: "Minimum players must be less than or equal to maximum players",
    path: ["playersMax"],
  });

export async function createGame(
  _prevState: CreateGameState,
  formData: FormData,
): Promise<CreateGameState> {
  const raw = {
    title: String(formData.get("title") ?? ""),
    pitch: String(formData.get("pitch") ?? ""),
    playersMin: String(formData.get("playersMin") ?? ""),
    playersMax: String(formData.get("playersMax") ?? ""),
    estimatedMinutes: String(formData.get("estimatedMinutes") ?? ""),
    rulesText: String(formData.get("rulesText") ?? ""),
  };

  const values = raw;
  const parsed = createGameSchema.safeParse(raw);

  if (!parsed.success) {
    const errors: CreateGameState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CreateGameState["errors"] | undefined;
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { errors, values };
  }

  const { title, pitch, playersMin, playersMax, estimatedMinutes, rulesText } = parsed.data;

  const compiler = getCompiler();
  const result = await compiler.compile({
    title,
    pitch,
    players: { min: playersMin, max: playersMax },
    estimatedMinutes,
    rulesText,
  });

  if (result.status !== "ok" || !result.spec || !result.presentation) {
    return {
      errors: {
        form:
          "We couldn't compile this yet. Review the details below, adjust your description, and try again.",
      },
      values,
      compile: {
        status: result.status === "ok" ? "failed" : result.status,
        unsupportedRules: result.unsupportedRules,
        issues: result.issues,
        coverage: result.coverage,
      },
    };
  }

  const id = slugify(title);
  const record: GameRecord = {
    id,
    title,
    pitch,
    designer: "You",
    players: { min: playersMin, max: playersMax },
    estimatedMinutes,
    status: "draft",
    createdAt: new Date().toISOString(),
    rulesText,
    versions: [
      {
        version: 1,
        createdAt: new Date().toISOString(),
        notes: "Generated from rules text",
        spec: result.spec,
        presentation: result.presentation,
        compileReport: {
          status: result.status,
          unsupportedRules: result.unsupportedRules,
          issues: result.issues,
          coverage: result.coverage,
          model: result.model,
          durationMs: result.durationMs,
          designSummary: result.designSummary,
        },
      },
    ],
    isShowcase: false,
  };

  saveGame(record);
  revalidatePath("/community");
  redirect(`/games/${id}?compiled=1`);
}

export async function publishGame(id: string): Promise<{ error?: string }> {
  const game = getGame(id);
  if (!game) return { error: "Game not found" };
  saveGame({ ...game, status: "published" });
  revalidatePath("/community");
  revalidatePath(`/games/${id}`);
  return {};
}
