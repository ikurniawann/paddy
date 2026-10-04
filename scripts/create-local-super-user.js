#!/usr/bin/env node
/**
 * Buat / update super admin di Postgres lokal (auth.users + public.users).
 *
 * Usage:
 *   SUPER_USER_EMAIL=super@arkivworld.com SUPER_USER_PASSWORD='Arkiv2026*#' node scripts/create-local-super-user.js
 */

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { Client } = require("pg");

const ROOT = path.join(__dirname, "..");
for (const name of [".env", ".env.local"]) {
  const file = path.join(ROOT, name);
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    // .env.local menang atas .env
    if (name === ".env.local" || process.env[k] === undefined) process.env[k] = v;
  }
}

const email = process.env.SUPER_USER_EMAIL || "super@arkivworld.com";
const password = process.env.SUPER_USER_PASSWORD || "Arkiv2026*#";
const fullName = process.env.SUPER_USER_NAME || "Arkiv Super Admin";
const url = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;

if (!url) {
  console.error("Set DATABASE_URL / MIGRATE_DATABASE_URL di .env.local");
  process.exit(1);
}

(async () => {
  const c = new Client({ connectionString: url });
  await c.connect();
  const hash = await bcrypt.hash(password, 10);

  const existing = await c.query(`SELECT id FROM auth.users WHERE lower(email)=lower($1)`, [email]);
  let userId;
  if (existing.rowCount) {
    userId = existing.rows[0].id;
    await c.query(
      `UPDATE auth.users SET password_hash=$1, email_verified_at=NOW(), raw_user_meta_data=$2::jsonb WHERE id=$3`,
      [hash, JSON.stringify({ role: "super_admin", full_name: fullName }), userId]
    );
    console.log("Updated existing auth user:", userId);
  } else {
    const ins = await c.query(
      `INSERT INTO auth.users (email, password_hash, email_verified_at, raw_user_meta_data, raw_app_meta_data)
       VALUES ($1,$2,NOW(),$3::jsonb,$4::jsonb) RETURNING id`,
      [email, hash, JSON.stringify({ role: "super_admin", full_name: fullName }), JSON.stringify({ role: "super_admin" })]
    );
    userId = ins.rows[0].id;
    console.log("Created auth user:", userId);
  }

  await c.query(
    `INSERT INTO public.users (id, full_name, role, brand_id, email, status)
     VALUES ($1,$2,'super_admin',NULL,$3,'active')
     ON CONFLICT (id) DO UPDATE SET full_name=EXCLUDED.full_name, role='super_admin', email=EXCLUDED.email, status='active'`,
    [userId, fullName, email]
  );

  await c.end();
  console.log("Super admin ready:");
  console.log("  Email   :", email);
  console.log("  Password:", password);
})().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
