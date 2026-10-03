import pool from "./db.js";


let schemaReady;

async function ensureReminderColumn() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(`
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS remind_at TIMESTAMP NULL
      `);

      // Preserve reminders for existing tasks
      await pool.query(`
        UPDATE tasks
        SET remind_at = due_date
        WHERE remind_at IS NULL
          AND due_date IS NOT NULL
      `);
    })();
  }

  return schemaReady;
}


export async function checkReminders() {
  try {
    await ensureReminderColumn();

    const result = await pool.query(`
  SELECT id, user_id, title, due_date, remind_at
  FROM tasks
  WHERE status = 'pending'
  AND remind_at IS NOT NULL
  AND remind_at <= CURRENT_TIMESTAMP
`);

    for (const task of result.rows) {

      // Check whether notification already exists
      const existing = await pool.query(
        `
        SELECT id
        FROM notifications
        WHERE task_id = $1
        AND type = 'task_reminder'
        LIMIT 1
        `,
        [task.id]
      );

      // Don't create duplicate notification
      if (existing.rows.length > 0) {
        continue;
      }

      await pool.query(
        `
        INSERT INTO notifications
        (user_id, task_id, message, type)
        VALUES ($1, $2, $3, $4)
        `,
        [
          task.user_id,
          task.id,
          `Task due: ${task.title}`,
          "task_reminder"
        ]
      );

      console.log(
        `Reminder created for task ${task.id}: ${task.title}`
      );
    }

  } catch (error) {
    console.error(
      "Reminder checker error:",
      error
    );
  }
}