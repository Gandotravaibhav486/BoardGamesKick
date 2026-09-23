import type { CompilerIssue, UnsupportedRule } from "@/lib/compiler/types";

export interface CreateGameCompileFailure {
  status: "failed" | "needs-clarification";
  unsupportedRules: UnsupportedRule[];
  issues: CompilerIssue[];
  coverage: { covered: string[]; uncovered: string[] };
}

export interface CreateGameState {
  errors: Partial<
    Record<"title" | "pitch" | "playersMin" | "playersMax" | "estimatedMinutes" | "rulesText" | "form", string>
  >;
  values: {
    title: string;
    pitch: string;
    playersMin: string;
    playersMax: string;
    estimatedMinutes: string;
    rulesText: string;
  };
  compile?: CreateGameCompileFailure;
}

export const initialCreateGameState: CreateGameState = {
  errors: {},
  values: {
    title: "",
    pitch: "",
    playersMin: "2",
    playersMax: "4",
    estimatedMinutes: "30",
    rulesText: "",
  },
};
