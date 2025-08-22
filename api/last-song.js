module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Sanity checks for env vars
  const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN } = process.env;
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    return res.status(500).json({
      error: "Missing environment variables",
      expected: ["CLIENT_ID", "CLIENT_SECRET", "REFRESH_TOKEN"]
    });
  }

  try {
    // Refresh access token
    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: REFRESH_TOKEN,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(500).json({
        error: "Failed to refresh token",
        details: tokenData
      });
    }

    //Get last played track
    const songRes = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=1",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const songData = await songRes.json();

    if (!songRes.ok) {
      return res.status(500).json({
        error: "Failed to fetch recently played",
        details: songData
      });
    }

    const item = songData.items && songData.items[0];
    const track = item && item.track;

    // Return for frontend
    return res.status(200).json({
      name: track?.name || null,
      artists: (track?.artists || []).map(a => a.name),
      url: track?.external_urls?.spotify || null,
      played_at: item?.played_at || null,
      album: {
        name: track?.album?.name || null,
        image: track?.album?.images?.[0]?.url || null
      },
      //debugging
      raw: songData
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", details: String(err) });
  }
};

