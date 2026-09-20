import pool from "./db.js";

try {
  const result = await pool.query("SELECT NOW()");

  console.log("PostgreSQL connected!");
  console.log("Database time:", result.rows[0].now);
} catch (error) {
  console.error("Database connection failed:");
  console.error(error.message);
} finally {
  await pool.end();
}