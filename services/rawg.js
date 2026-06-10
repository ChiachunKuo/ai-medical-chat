const GENRE_MAP = {
  RPG: "role-playing-games-rpg",
  Action: "action",
  Adventure: "adventure",
  Shooter: "shooter",
  FPS: "shooter",
  Survival: "survival",
  Horror: "adventure",
  Puzzle: "puzzle",
  Strategy: "strategy",
  Simulation: "simulation",
  Racing: "racing",
  Sandbox: "adventure",
  "Open World": "adventure",
  "Co-op": "action"
};

export async function searchGames(genres = []) {

  const genre =
    genres[0] || "action";

  const rawgGenre =
    GENRE_MAP[genre] || "action";

  const response =
  await fetch(
    `https://api.rawg.io/api/games?key=${process.env.RAWG_KEY}&genres=${rawgGenre}&page_size=40`
  );

  if (!response.ok) {
    throw new Error(
      `RAWG ${response.status}`
    );
  }

  const data =
    await response.json();

  return data.results || [];
}
