const fs = require("node:fs");
const path = require("node:path");

const required = ["AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_AUDIENCE"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Variáveis obrigatórias ausentes: ${missing.join(", ")}`);
  process.exit(1);
}

const root = __dirname;
const output = path.join(root, "dist");
fs.mkdirSync(output, { recursive: true });
for (const file of ["index.html", "app.js", "styles.css"]) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}

const config = {
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  audience: process.env.AUTH0_AUDIENCE,
  apiBaseUrl: process.env.API_BASE_URL || "/api"
};
fs.writeFileSync(
  path.join(output, "auth0-config.js"),
  `window.AUTH0_CONFIG = ${JSON.stringify(config)};\n`,
  "utf8"
);
console.log("Front pronto em dist/");
