/**
 * seed-admin.mjs
 * Run once to create admin users in the database.
 * Usage: node seed-admin.mjs
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

// Load .env from artifacts/api-server
const envPath = path.resolve(__dirname, "artifacts/api-server/.env");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.trim().match(/^([^#][^=]*)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL not found. Check artifacts/api-server/.env");
  process.exit(1);
}

// ── Add admins here — re-run the script whenever you add one ───
const ADMINS = [
  { name: "Admin",         email: "one.waymirror@outlook.com",   password: "Shipnot2020!" },
  { name: "Mohammed Arif", email: "work.mohammedarif@gmail.com", password: "223456"       },
  
  // { name: "Another Admin", email: "another@example.com", password: "SecurePass!" },
];
// ───────────────────────────────────────────────────────────────

const client = new Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();
  console.log(`\n🔑  Seeding ${ADMINS.length} admin(s)...\n`);

  for (const { name, email, password } of ADMINS) {
    const normEmail = email.toLowerCase().trim();

    const existing = await client.query(
      "SELECT id, email, role FROM users WHERE email = $1 LIMIT 1",
      [normEmail]
    );

    if (existing.rows[0]) {
      const row = existing.rows[0];
      if (row.role === "admin") {
        console.log(`  ✅  Already admin:    ${row.email}`);
      } else {
        await client.query("UPDATE users SET role = 'admin' WHERE id = $1", [row.id]);
        console.log(`  ⬆️   Upgraded to admin: ${row.email}`);
      }
      continue;
    }

    // Create new admin user
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();
    const now = new Date();

    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role, plan, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'admin', 'free', $5, $5)`,
      [userId, name, normEmail, passwordHash, now]
    );
    console.log(`  ✅  Created admin:    ${normEmail}  (id: ${userId})`);
  }

  console.log("\n✅  Done.\n");
  await client.end();
}

main().catch(err => {
  console.error("❌  Failed:", err.message);
  process.exit(1);
});
