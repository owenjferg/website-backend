export const config = { runtime: "edge" };

export default async function handler(req) {
  const headers = {
    "Access-Control-Allow-Origin": "https://owenjferg.nekoweb.org/",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "content-type": "application/json"
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN } = process.env;
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    return new Response(JSON.stringify({
      error: "Missing environment variables",
      expected: ["CLIENT_ID", "CLIENT_SECRET", "REFRESH_TOKEN"]
    }), { status: 500, headers });
  }

  try {
    const basicAuth = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

    //Refresh access token
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: REFRESH_TOKEN
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return new Response(JSON.stringify({
        error: "Failed to refresh token",
        details: tokenData
      }), { status: 500, headers });
    }

    //Get last played
    const songRes = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=1",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const songData = await songRes.json();
    if (!songRes.ok) {
      return new Response(JSON.stringify({
        error: "Failed to fetch recently played",
        details: songData
      }), { status: 500, headers });
    }

    const item = songData.items?.[0];
    const track = item?.track;

    return new Response(JSON.stringify({
      name: track?.name ?? null,
      artists: (track?.artists ?? []).map(a => a.name),
      url: track?.external_urls?.spotify ?? null,
      played_at: item?.played_at ?? null,
      album: {
        name: track?.album?.name ?? null,
        image: track?.album?.images?.[0]?.url ?? null
      }
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: "Server error", details: String(e) }), { status: 500, headers });
  }
}

