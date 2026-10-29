import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (see .env.example)");

export const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  max: Number(process.env.DB_POOL_SIZE ?? 10),
  idle_timeout: 30,
  onnotice: () => {},
  // the transaction pooler (port 6543) doesn't support prepared statements
  prepare: !process.env.DATABASE_URL.includes(":6543"),
});
