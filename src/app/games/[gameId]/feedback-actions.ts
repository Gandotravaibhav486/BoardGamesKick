"use server";

import { revalidatePath } from "next/cache";
import { addFeedback, upvoteFeedback } from "@/lib/store";

export interface SubmitFeedbackResult {
  error?: string;
}

export async function submitFeedbackAction(
  gameId: string,
  formData: FormData,
): Promise<SubmitFeedbackResult> {
  const author = String(formData.get("author") ?? "").trim() || "You";
  const comment = String(formData.get("comment") ?? "").trim();
  const funScore = Number(formData.get("funScore"));
  const clarityScore = Number(formData.get("clarityScore"));

  if (comment.length < 10) {
    return { error: "Share a bit more detail (at least 10 characters)." };
  }
  if (!Number.isInteger(funScore) || funScore < 1 || funScore > 5) {
    return { error: "Fun score must be between 1 and 5." };
  }
  if (!Number.isInteger(clarityScore) || clarityScore < 1 || clarityScore > 5) {
    return { error: "Clarity score must be between 1 and 5." };
  }

  addFeedback(gameId, { author, funScore, clarityScore, comment });
  revalidatePath(`/games/${gameId}`);
  return {};
}

export async function upvoteFeedbackAction(id: string, gameId: string): Promise<void> {
  upvoteFeedback(id);
  revalidatePath(`/games/${gameId}`);
}
