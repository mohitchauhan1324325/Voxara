import pool from "./db.js";

export async function checkReminders() {
  try {
    const result = await pool.query(`
      SELECT id, user_id, title, due_date
      FROM tasks
      WHERE status = 'pending'
      AND due_date IS NOT NULL
      AND due_date <= CURRENT_TIMESTAMP
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