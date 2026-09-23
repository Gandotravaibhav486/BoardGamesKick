import { notFound } from "next/navigation";
import { getGame, latestVersion } from "@/lib/store";
import { Tabletop } from "@/components/renderer/Tabletop";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const game = getGame(gameId);
  if (!game) notFound();

  const version = latestVersion(game);

  return (
    <Tabletop
      spec={version.spec}
      presentation={version.presentation}
      gameTitle={game.title}
      gameId={game.id}
    />
  );
}
