import {
  Circle,
  Coins,
  Dice5,
  Flag,
  Flame,
  HelpCircle,
  Hourglass,
  Layers,
  Leaf,
  Moon,
  Shield,
  Square,
  Star,
  Sun,
  Trophy,
  Waves,
  type LucideProps,
} from "lucide-react";
import type { IconName } from "@/lib/presentation/types";

const registry: Record<IconName, typeof Square> = {
  tile: Square,
  token: Circle,
  card: Layers,
  coin: Coins,
  star: Star,
  trophy: Trophy,
  dice: Dice5,
  hourglass: Hourglass,
  flag: Flag,
  shield: Shield,
  leaf: Leaf,
  flame: Flame,
  wave: Waves,
  moon: Moon,
  sun: Sun,
};

export function Icon({ name, ...props }: { name?: IconName } & LucideProps) {
  const Cmp = (name && registry[name]) || HelpCircle;
  return <Cmp {...props} />;
}
