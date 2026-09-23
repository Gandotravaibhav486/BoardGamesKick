import type { GameSpec } from "@/lib/game-spec/types";
import type { PresentationSpec } from "@/lib/presentation/types";
import type { CompileReport } from "@/lib/compiler/types";
import { tidepoolPresentation, tidepoolSpec } from "@/lib/showcase/tidepool";

/**
 * Phase 0 persistence: in-memory, process-local. Resets on server restart.
 * Replace with a database in a later phase. Clearly MOCKED.
 */

export type GameStatus = "draft" | "published";

export interface GameVersion {
  version: number;
  createdAt: string;
  notes: string;
  spec: GameSpec;
  presentation: PresentationSpec;
  /** Compiler report for this version, if it was AI-compiled */
  compileReport?: CompileReport;
}

export interface GameRecord {
  id: string;
  title: string;
  pitch: string;
  designer: string;
  players: { min: number; max: number };
  estimatedMinutes: number;
  status: GameStatus;
  createdAt: string;
  rulesText: string;
  versions: GameVersion[];
  /** Original showcase ruleset shipped with the app, vs. user-created */
  isShowcase: boolean;
}

export interface PlaytestFeedback {
  id: string;
  gameId: string;
  author: string;
  createdAt: string;
  funScore: number;
  clarityScore: number;
  comment: string;
  upvotes: number;
  creatorResponse?: string;
}

export interface RewardTier {
  id: string;
  title: string;
  amountCents: number;
  description: string;
  limited?: number;
  claimed: number;
}

export interface Backer {
  id: string;
  name: string;
  tierId: string;
  amountCents: number;
  backedAt: string;
}

export interface Campaign {
  gameId: string;
  status: "live" | "funded";
  goalCents: number;
  deadline: string;
  story: string;
  rewardTiers: RewardTier[];
  backers: Backer[];
  createdAt: string;
}

const games = new Map<string, GameRecord>();
const feedback = new Map<string, PlaytestFeedback>();
const campaigns = new Map<string, Campaign>();

const now = () => new Date().toISOString();

// Small deterministic PRNG (mulberry32) so mock campaign numbers are stable
// across renders but vary per game, without pulling in the game engine.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const FIRST_NAMES = [
  "Alex", "Priya", "Sam", "Jordan", "Mei", "Diego", "Nora", "Kwame", "Yuki",
  "Elena", "Owen", "Fatima", "Theo", "Ingrid", "Marcus", "Lena", "Cass",
  "Rosa", "Hiro", "Wren",
];
const LAST_INITIALS = ["B.", "K.", "T.", "R.", "M.", "L.", "S.", "D.", "V.", "N."];

function seedRewardTiers(rng: () => number): RewardTier[] {
  return [
    {
      id: "digital-thanks",
      title: "Digital thanks",
      amountCents: 500,
      description: "Your name on the digital backers wall and early updates as the game develops.",
      claimed: Math.floor(rng() * 20) + 8,
    },
    {
      id: "credits",
      title: "Name in the credits",
      amountCents: 1500,
      description: "Everything above, plus your name printed in the game's rulebook credits.",
      claimed: Math.floor(rng() * 30) + 15,
    },
    {
      id: "print-and-play",
      title: "Print-and-play kit",
      amountCents: 3500,
      description: "A print-ready PDF of the full game so you can build and play your own copy at home.",
      limited: 40,
      claimed: Math.floor(rng() * 30) + 5,
    },
    {
      id: "signed-copy",
      title: "Signed physical copy",
      amountCents: 7500,
      description: "A physical copy of the finished game, signed by the designer, shipped when production wraps.",
      limited: 15,
      claimed: Math.floor(rng() * 12) + 1,
    },
  ];
}

function seedBackers(rng: () => number, tiers: RewardTier[], targetCount: number, createdAt: string): Backer[] {
  const backers: Backer[] = [];
  const createdMs = new Date(createdAt).getTime();
  for (let i = 0; i < targetCount; i++) {
    const tier = tiers[Math.floor(rng() * tiers.length)];
    const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
    const last = LAST_INITIALS[Math.floor(rng() * LAST_INITIALS.length)];
    const daysAgo = Math.floor(rng() * 18);
    backers.push({
      id: `backer-${i}-${tier.id}`,
      name: `${first} ${last}`,
      tierId: tier.id,
      amountCents: tier.amountCents,
      backedAt: new Date(createdMs - daysAgo * 86_400_000).toISOString(),
    });
  }
  return backers;
}

function seedCampaignFor(game: GameRecord): Campaign {
  // Tidepool gets a fixed seed offset so its demo campaign reads as a
  // deliberately curated showcase (mid-funded, lots of backers) rather than
  // a randomly generated one alongside newer, user-created games.
  const isTidepool = game.id === "tidepool";
  const seed = isTidepool ? hashSeed(game.id) ^ 0x5eed0001 : hashSeed(game.id);
  const rng = mulberry32(seed);
  const createdAt = now();
  const deadline = new Date(Date.now() + 21 * 86_400_000).toISOString();

  // Small first print run: ~$6k keeps the mock backer count in the low hundreds.
  const goalCents = isTidepool
    ? 600_000
    : Math.round((game.players.max * 4000 + game.estimatedMinutes * 200) / 100) * 100;

  const rewardTiers = seedRewardTiers(rng);
  const backerCount = isTidepool ? 62 : Math.floor(rng() * 10) + 4;
  const backers = seedBackers(rng, rewardTiers, backerCount, createdAt);

  if (isTidepool) {
    // Nudge the total into a compelling 60-85% funded range without
    // being fully funded, so backing still feels meaningful in the demo.
    const targetRatio = 0.68 + rng() * 0.12;
    const targetRaised = Math.round(goalCents * targetRatio);
    let raised = backers.reduce((sum, b) => sum + b.amountCents, 0);
    let i = 0;
    while (raised < targetRaised && i < 4000) {
      const tier = rewardTiers[Math.floor(rng() * rewardTiers.length)];
      if (tier.limited !== undefined && tier.claimed >= tier.limited) {
        i++;
        continue;
      }
      const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
      const last = LAST_INITIALS[Math.floor(rng() * LAST_INITIALS.length)];
      backers.push({
        id: `backer-extra-${i}-${tier.id}`,
        name: `${first} ${last}`,
        tierId: tier.id,
        amountCents: tier.amountCents,
        backedAt: new Date(Date.now() - Math.floor(rng() * 18) * 86_400_000).toISOString(),
      });
      tier.claimed += 1;
      raised += tier.amountCents;
      i++;
    }
  }

  const story = isTidepool
    ? [
        "Tidepool started as a two-player prototype we built to see how far a simple \"take from a shared pool\" mechanic could go. After a few dozen playtests, the reef mosaic scoring turned out to be the part everyone kept talking about, so we built the whole game around it.",
        "This campaign covers a first small print run: custom shell-shaped components, a felt-textured board, and full-color reef tiles. Everything you see in the Play tab is the same ruleset that would ship in the box.",
        "This is a demo campaign for BoardGamesKick and no real payments are processed. It exists so you can see how the play-before-you-back flow works end to end.",
      ].join("\n\n")
    : [
        `${game.title} is still early, but the ruleset in the Play tab is real and playable right now. Backing this campaign helps fund the next round of production polish.`,
        "This is a simulated campaign for demonstration purposes on BoardGamesKick. No real payments are processed, and reward numbers are generated for illustration only.",
      ].join("\n\n");

  const campaign: Campaign = {
    gameId: game.id,
    status: "live",
    goalCents,
    deadline,
    story,
    rewardTiers,
    backers,
    createdAt,
  };
  const raised = raisedCents(campaign);
  if (raised >= goalCents) campaign.status = "funded";
  campaigns.set(game.id, campaign);
  return campaign;
}

let feedbackSeeded = false;

function seedFeedback() {
  if (feedbackSeeded) return;
  feedbackSeeded = true;
  const seeded: PlaytestFeedback[] = [
    {
      id: "fb-tidepool-1",
      gameId: "tidepool",
      author: "Priya N.",
      createdAt: "2026-08-14T10:00:00.000Z",
      funScore: 5,
      clarityScore: 4,
      comment:
        "The drafting tension is fantastic. Watching a good tidepool get picked apart shell by shell before your turn comes around had our whole table groaning and laughing. Ran two games back to back.",
      upvotes: 12,
    },
    {
      id: "fb-tidepool-2",
      gameId: "tidepool",
      author: "Marcus D.",
      createdAt: "2026-08-20T15:30:00.000Z",
      funScore: 4,
      clarityScore: 2,
      comment:
        "Really liked it once we got going, but the spill penalty wording confused everyone until the final scoring pass. We assumed spilled shells just didn't count, not that they actively cost points. A clearer callout on the reference card would help a lot.",
      upvotes: 8,
      creatorResponse:
        "Good catch, thank you. We're rewriting the spill rule text to spell out the point cost up front instead of leaving it for scoring.",
    },
    {
      id: "fb-tidepool-3",
      gameId: "tidepool",
      author: "Elena R.",
      createdAt: "2026-08-25T09:15:00.000Z",
      funScore: 4,
      clarityScore: 4,
      comment:
        "Reef mosaic scoring is the best part of the game for me. It rewards planning ahead without punishing you too hard for adapting when someone snipes a row you wanted.",
      upvotes: 5,
    },
    {
      id: "fb-tidepool-4",
      gameId: "tidepool",
      author: "Tom K.",
      createdAt: "2026-09-01T18:45:00.000Z",
      funScore: 3,
      clarityScore: 3,
      comment:
        "Solid prototype. Downtime between turns can drag with four players since everyone is tracking the shore pile. Might be worth a turn timer or a simpler shore rule at higher player counts.",
      upvotes: 3,
    },
  ];
  for (const item of seeded) feedback.set(item.id, item);
}

function seedShowcase() {
  if (games.has("tidepool")) return;
  games.set("tidepool", {
    id: "tidepool",
    title: tidepoolSpec.name,
    pitch: tidepoolSpec.summary,
    designer: "BoardGamesKick team",
    players: tidepoolSpec.players,
    estimatedMinutes: tidepoolSpec.estimatedMinutes,
    status: "published",
    createdAt: now(),
    rulesText:
      "Each round, fill five tidepools with four shells each from the bag. On your turn, take all shells of one type from a tidepool (the rest slide to the shore) or from the shore, and put them into one collection row of matching type. Overflow goes to your spill row and costs points. When every pool and the shore are empty, move each completed row's rightmost shell into your reef mosaic and score it for adjacency. The game ends when someone completes a reef row.",
    versions: [
      { version: 1, createdAt: now(), notes: "Initial showcase ruleset", spec: tidepoolSpec, presentation: tidepoolPresentation },
    ],
    isShowcase: true,
  });
}

seedShowcase();

export function listGames(): GameRecord[] {
  seedShowcase();
  return [...games.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getGame(id: string): GameRecord | undefined {
  seedShowcase();
  return games.get(id);
}

export function saveGame(game: GameRecord): GameRecord {
  games.set(game.id, game);
  return game;
}

export function latestVersion(game: GameRecord): GameVersion {
  return game.versions[game.versions.length - 1];
}

export function listFeedback(gameId: string): PlaytestFeedback[] {
  seedFeedback();
  return [...feedback.values()]
    .filter((item) => item.gameId === gameId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addFeedback(
  gameId: string,
  data: { author: string; funScore: number; clarityScore: number; comment: string },
): PlaytestFeedback {
  seedFeedback();
  const item: PlaytestFeedback = {
    id: `fb-${gameId}-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    gameId,
    author: data.author,
    createdAt: now(),
    funScore: data.funScore,
    clarityScore: data.clarityScore,
    comment: data.comment,
    upvotes: 0,
  };
  feedback.set(item.id, item);
  return item;
}

export function upvoteFeedback(id: string): PlaytestFeedback | undefined {
  seedFeedback();
  const item = feedback.get(id);
  if (!item) return undefined;
  const updated = { ...item, upvotes: item.upvotes + 1 };
  feedback.set(id, updated);
  return updated;
}

export function raisedCents(campaign: Campaign): number {
  return campaign.backers.reduce((sum, b) => sum + b.amountCents, 0);
}

export function getCampaign(gameId: string): Campaign | undefined {
  return campaigns.get(gameId);
}

export function getOrCreateCampaign(gameId: string): Campaign {
  const existing = campaigns.get(gameId);
  if (existing) return existing;
  const game = getGame(gameId);
  if (!game) throw new Error(`Cannot create campaign for unknown game: ${gameId}`);
  return seedCampaignFor(game);
}

export function backCampaign(
  gameId: string,
  input: { tierId: string; backerName: string },
): { campaign: Campaign; backer: Backer } | { error: string } {
  const campaign = getOrCreateCampaign(gameId);
  const tier = campaign.rewardTiers.find((t) => t.id === input.tierId);
  if (!tier) return { error: "That reward tier no longer exists." };
  if (tier.limited !== undefined && tier.claimed >= tier.limited) {
    return { error: "That reward tier is sold out." };
  }
  const backer: Backer = {
    id: `backer-${gameId}-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    name: input.backerName.trim() || "You",
    tierId: tier.id,
    amountCents: tier.amountCents,
    backedAt: now(),
  };
  tier.claimed += 1;
  campaign.backers.push(backer);
  if (raisedCents(campaign) >= campaign.goalCents) campaign.status = "funded";
  campaigns.set(gameId, campaign);
  return { campaign, backer };
}

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "game";
  let slug = base;
  let n = 2;
  while (games.has(slug)) slug = `${base}-${n++}`;
  return slug;
}
