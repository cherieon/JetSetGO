const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the frontend folder  
app.use(express.static(path.join(__dirname, 'frontend')));

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "jetsetgo",
  password: "Cranbrook1",
  port: 5432
});

// API Routes

// Serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get("/flights", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*, c.name, p.manufacturer, p.modelname
      FROM flights f
      JOIN celebrities c ON f.celebrityid = c.celebrityid
      JOIN planemodels p ON f.planeid = p.planeid
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch flights" });
  }
});


app.post("/flights", async (req, res) => {
  const {
    celebrityid,
    planeid,
    flightnumber,
    departureairport,
    arrivalairport,
    departuretime,
    arrivaltime
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO flights
      (celebrityid, planeid, flightnumber, departureairport, arrivalairport, departuretime, arrivaltime)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        celebrityid,
        planeid,
        flightnumber,
        departureairport,
        arrivalairport,
        departuretime,
        arrivaltime
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create flight" });
  }
});

// Get all celebrities for homepage tiles
app.get("/celebrities", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM celebrities");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch celebrities" });
  }
});

// Get flights for a specific celebrity
app.get("/celebrities/:id/flights", async (req, res) => {
  const celebrityId = req.params.id;
  try {
    const result = await pool.query(`
      SELECT f.*, c.name, p.manufacturer, p.modelname
      FROM flights f
      JOIN celebrities c ON f.celebrityid = c.celebrityid
      JOIN planemodels p ON f.planeid = p.planeid
      WHERE f.celebrityid = $1
    `, [celebrityId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch celebrity flights" });
  }
});

// Get all plane models for forms
app.get("/planes", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM planemodels");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch planes" });
  }
});

// Update a flight
app.put("/flights/:id", async (req, res) => {
  const flightId = req.params.id;
  const {
    celebrityid,
    planeid,
    flightnumber,
    departureairport,
    arrivalairport,
    departuretime,
    arrivaltime
  } = req.body;

  try {
    const result = await pool.query(`
      UPDATE flights SET
      celebrityid = $1,
      planeid = $2,
      flightnumber = $3,
      departureairport = $4,
      arrivalairport = $5,
      departuretime = $6,
      arrivaltime = $7
      WHERE flightid = $8
      RETURNING *
    `, [celebrityid, planeid, flightnumber, departureairport, arrivalairport, departuretime, arrivaltime, flightId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Flight not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update flight" });
  }
});

// Delete a flight
app.delete("/flights/:id", async (req, res) => {
  const flightId = req.params.id;
  try {
    const result = await pool.query("DELETE FROM flights WHERE flightid = $1 RETURNING *", [flightId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Flight not found" });
    }

    res.json({ message: "Flight deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete flight" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

