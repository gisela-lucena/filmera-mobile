const fs = require("fs");
const path = require("path");

const settingsPath = path.resolve(__dirname, "../.expo/settings.json");

fs.mkdirSync(path.dirname(settingsPath), { recursive: true });

let settings = {};

try {
  settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") {
    throw error;
  }
}

settings.urlRandomness = "zguabrc";
fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
