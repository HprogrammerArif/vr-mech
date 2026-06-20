import { defineConfig } from "drizzle-kit";
import path from "path";
import { readFileSync, existsSync } from "fs";

// Auto-load .env from artifacts/api-server (where the real env lives)
const envPath = path.resolve(__dirname, "../../artifacts/api-server/.env");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.trim().match(/^([^#][^=]*)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
