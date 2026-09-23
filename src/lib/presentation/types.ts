/**
 * Presentation Spec — how a game looks. Pure data, no logic.
 * See docs/PRESENTATION_SPEC.md.
 */

export type ThemeMode = "light" | "dark";

export interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  mutedText: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export type IconName =
  | "tile"
  | "token"
  | "card"
  | "coin"
  | "star"
  | "trophy"
  | "dice"
  | "hourglass"
  | "flag"
  | "shield"
  | "leaf"
  | "flame"
  | "wave"
  | "moon"
  | "sun";

/** Visual treatment for one entity type in the Game Spec */
export interface EntityStyle {
  entityTypeId: string;
  /** CSS color; used as the tile/token fill */
  color: string;
  icon: IconName;
  label: string;
}

export type LayoutRegion = "table" | "my-area" | "opponents" | "log" | "actions";

export interface ZonePlacement {
  zoneId: string;
  region: LayoutRegion;
  /** Human-facing label overriding the spec's name if desired */
  label?: string;
}

export interface PresentationSpec {
  specVersion: "0.1";
  gameSpecId: string;
  themeMode: ThemeMode;
  colors: Partial<ThemeColors>;
  entityStyles: EntityStyle[];
  zonePlacements: ZonePlacement[];
  /** Board surface texture accent */
  tableStyle: "felt" | "wood" | "linen";
  animation: { enabled: boolean; speed: "slow" | "normal" | "fast" };
}
