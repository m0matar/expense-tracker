const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = 3000;

const allowedCategories = [
  "Food",
  "Transport",
  "Bills",
  "Entertainment",
  "Other"
];

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

function validateExpense(data) {
  const { title, amount, category, date } = data;

  if (!title || title.trim() === "") {
    return "Title is required";
  }

  if (amount === undefined || amount === null || amount === "") {
    return "Amount is required";
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return "Amount must be a number greater than 0";
  }

  if (!allowedCategories.includes(category)) {
    return "Invalid category";
  }

  if (!date) {
    return "Date is required";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return "Date must be in YYYY-MM-DD format";
  }

  return null;
}

app.get("/api/expenses", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        title,
        amount::float8 AS amount,
        category,
        to_char(date, 'YYYY-MM-DD') AS date
      FROM expenses
      ORDER BY id
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to get expenses"
    });
  }
});

app.get("/api/expenses/summary", async (req, res) => {
  try {
    const { month } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        message: "Month must be in YYYY-MM format"
      });
    }

    const [year, monthNumber] = month.split("-").map(Number);

    if (monthNumber < 1 || monthNumber > 12) {
      return res.status(400).json({
        message: "Month must be between 01 and 12"
      });
    }

    const summaryResult = await pool.query(`
      SELECT
        COALESCE(SUM(amount), 0)::float8 AS "totalSpent",
        COUNT(*)::int AS "numberOfExpenses",
        COALESCE(AVG(amount), 0)::float8 AS "averageExpense",
        COALESCE(MAX(amount), 0)::float8 AS "highestExpense"
      FROM expenses
      WHERE date >= $1::date
        AND date < ($1::date + INTERVAL '1 month')
    `, [`${year}-${String(monthNumber).padStart(2, "0")}-01`]);

    const categoryResult = await pool.query(`
      SELECT
        category,
        SUM(amount)::float8 AS total
      FROM expenses
      WHERE date >= $1::date
        AND date < ($1::date + INTERVAL '1 month')
      GROUP BY category
      ORDER BY total DESC
    `, [`${year}-${String(monthNumber).padStart(2, "0")}-01`]);

    res.status(200).json({
      ...summaryResult.rows[0],
      byCategory: categoryResult.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to get monthly summary"
    });
  }
});

app.get("/api/expenses/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    const result = await pool.query(`
      SELECT
        id,
        title,
        amount::float8 AS amount,
        category,
        to_char(date, 'YYYY-MM-DD') AS date
      FROM expenses
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to get expense"
    });
  }
});

app.post("/api/expenses", async (req, res) => {
  try {
    const validationError = validateExpense(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError
      });
    }

    const { title, amount, category, date } = req.body;
    const numericAmount = Number(amount);

    const result = await pool.query(`
      INSERT INTO expenses (title, amount, category, date)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        title,
        amount::float8 AS amount,
        category,
        to_char(date, 'YYYY-MM-DD') AS date
    `, [
      title.trim(),
      numericAmount,
      category,
      date
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to add expense"
    });
  }
});

app.put("/api/expenses/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    const validationError = validateExpense(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError
      });
    }

    const { title, amount, category, date } = req.body;
    const numericAmount = Number(amount);

    const result = await pool.query(`
      UPDATE expenses
      SET
        title = $1,
        amount = $2,
        category = $3,
        date = $4
      WHERE id = $5
      RETURNING
        id,
        title,
        amount::float8 AS amount,
        category,
        to_char(date, 'YYYY-MM-DD') AS date
    `, [
      title.trim(),
      numericAmount,
      category,
      date,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update expense"
    });
  }
});

app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    const result = await pool.query(
      "DELETE FROM expenses WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    res.status(200).json({
      message: "Expense deleted successfully"
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to delete expense"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});