"use server";

import { revalidatePath } from "next/cache";
import { backCampaign } from "@/lib/store";

export async function backGameAction(
  gameId: string,
  tierId: string,
  backerName: string,
): Promise<{ error?: string; backerAmountCents?: number }> {
  const result = backCampaign(gameId, { tierId, backerName: backerName || "You" });
  if ("error" in result) return { error: result.error };
  revalidatePath(`/games/${gameId}`);
  return { backerAmountCents: result.backer.amountCents };
}
