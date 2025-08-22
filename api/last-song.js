import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const basicAuth = Buffer
      .from(process.env.CLIENT_ID + ":" + process.env.CLIENT_SECRET)
      .toString("base64");

    // 1) Refresh the access token
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + basicAuth,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: process.env.REFRESH_TOKEN,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Token error:", tokenData);
      return res.status(500).json({ error: "Failed to refresh token", details: tokenData });
    }

    // 2) Fetch last played track
    const songRes = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=1",
      { headers: { Authorization: "Bearer " + tokenData.access_token } }
    );
    const songData = await songRes.json();
    if (!songRes.ok) {
      console.error("Spotify API error:", songData);
      return res.status(500).json({ error: "Failed to fetch song", details: songData });
    }

    // 3) Simplify the payload for your frontend
    const item = songData.items?.[0];
    const track = item?.track;

    // CORS so your Nekoweb site can call this
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({
      name: track?.name,
      artists: (track?.artists || []).map(a => a.name),
      url: track?.external_urls?.spotify,
      played_at: item?.played_at,
      album: {
        name: track?.album?.name,
        image: track?.album?.images?.[0]?.url
      }
    });
  } catch (e) {
    console.error(e);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ error: "Server error" });
  }
}

