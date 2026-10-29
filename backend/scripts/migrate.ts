// Applies every migrations/*.sql file that hasn't run yet, in name order.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "../src/db.js";

const dir = join(import.meta.dirname, "..", "migrations");

await sql`create schema if not exists analytics`;
await sql`create table if not exists analytics._migrations (name text primary key, applied_at timestamptz not null default now())`;
const done = new Set((await sql`select name from analytics._migrations`).map((r) => r.name));

for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(file)) continue;
  await sql.begin(async (tx) => {
    await tx.unsafe(readFileSync(join(dir, file), "utf8"));
    await tx`insert into analytics._migrations (name) values (${file})`;
  });
  console.log("applied", file);
}
console.log("migrations up to date");
await sql.end();
