import fetch from "node-fetch";

export default async function handler(req, res) {
  const refresh_token = process.env.REFRESH_TOKEN;
  const basicAuth = Buffer.from(
    process.env.CLIENT_ID + ":" + process.env.CLIENT_SECRET
  ).toString("base64");

  // refresh access token
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + basicAuth,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
    }),
  });
  const tokenData = await tokenRes.json();

  // fetch last song
  const songRes = await fetch(
    "https://api.spotify.com/v1/me/player/recently-played?limit=1",
    {
      headers: {
        Authorization: "Bearer " + tokenData.access_token,
      },
    }
  );
  const songData = await songRes.json();

  res.status(200).json(songData);
}

