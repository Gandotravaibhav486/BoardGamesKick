import type { GameSpec } from "@/lib/game-spec/types";
import type { PresentationSpec } from "@/lib/presentation/types";

export interface CompileInput {
  title: string;
  pitch: string;
  players: { min: number; max: number };
  estimatedMinutes: number;
  rulesText: string;
}

export interface UnsupportedRule {
  rule: string;
  reason: string;
  suggestedClarification: string;
}

export interface CompilerIssue {
  severity: "warning" | "ambiguity";
  message: string;
  question?: string;
}

export interface CompileResult {
  status: "ok" | "needs-clarification" | "failed";
  spec?: GameSpec;
  presentation?: PresentationSpec;
  unsupportedRules: UnsupportedRule[];
  issues: CompilerIssue[];
  /** Which sections of the rules text were represented, for the coverage report */
  coverage: { covered: string[]; uncovered: string[] };
  /** Model id that produced this result, absent for the mock compiler */
  model?: string;
  durationMs?: number;
  /** One-line human summary of the design the compiler produced */
  designSummary?: string;
}

/** Serializable subset of CompileResult persisted alongside a GameVersion */
export interface CompileReport {
  status: CompileResult["status"];
  unsupportedRules: UnsupportedRule[];
  issues: CompilerIssue[];
  coverage: { covered: string[]; uncovered: string[] };
  model?: string;
  durationMs?: number;
  designSummary?: string;
}

/**
 * AI Rules Compiler boundary.
 * The LLM only ever produces structured data that must pass schema and
 * semantic validation. It never produces executable code.
 */
export interface RulesCompiler {
  compile(input: CompileInput): Promise<CompileResult>;
}
