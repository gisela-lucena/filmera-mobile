const fs = require("fs");
const path = require("path");

const appJson = require("./app.json");

function readReplitEnv(name) {
  const replitPath = path.resolve(__dirname, "../../.replit");

  try {
    const text = fs.readFileSync(replitPath, "utf8");
    const match = text.match(new RegExp(`^\\s*${name}\\s*=\\s*["']?([^"'\\n]+)["']?\\s*$`, "m"));
    return match?.[1];
  } catch {
    return undefined;
  }
}

const tmdbToken = process.env.EXPO_PUBLIC_TMDB_TOKEN || readReplitEnv("EXPO_PUBLIC_TMDB_TOKEN");

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      ...(tmdbToken ? { EXPO_PUBLIC_TMDB_TOKEN: tmdbToken } : {}),
      eas: {
        projectId: "c60f0755-8e71-4276-9d2d-5a6223fac47d",
      },
    },
  },
};
