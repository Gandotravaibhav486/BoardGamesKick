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
