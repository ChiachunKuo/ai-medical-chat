export async function searchGames(keywords) {

  const search =
    keywords.join(" ");

  const response =
    await fetch(
      `https://api.rawg.io/api/games?key=${process.env.RAWG_KEY}&search=${encodeURIComponent(search)}&page_size=12`
    );

  const data =
    await response.json();

  return data.results || [];
}