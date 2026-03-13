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

// Proxy live aircraft positions from OpenSky so the frontend avoids CORS issues.
app.get("/api/live-flights", async (req, res) => {
  try {
    const lamin = Number.parseFloat(req.query.lamin);
    const lamax = Number.parseFloat(req.query.lamax);
    const lomin = Number.parseFloat(req.query.lomin);
    const lomax = Number.parseFloat(req.query.lomax);

    const hasBBox = [lamin, lamax, lomin, lomax].every((value) => Number.isFinite(value));

    const params = new URLSearchParams();
    if (hasBBox) {
      params.set("lamin", String(lamin));
      params.set("lamax", String(lamax));
      params.set("lomin", String(lomin));
      params.set("lomax", String(lomax));
    }

    const authUser = process.env.OPENSKY_USERNAME;
    const authPass = process.env.OPENSKY_PASSWORD;
    const authHeader = authUser && authPass
      ? { Authorization: `Basic ${Buffer.from(`${authUser}:${authPass}`).toString("base64")}` }
      : {};

    const url = `https://opensky-network.org/api/states/all${params.toString() ? `?${params.toString()}` : ""}`;
    const openskyResponse = await fetch(url, { headers: authHeader });

    if (!openskyResponse.ok) {
      return res.status(openskyResponse.status).json({
        error: "Failed to fetch live flights",
        details: `OpenSky response ${openskyResponse.status}`
      });
    }

    const payload = await openskyResponse.json();
    const states = Array.isArray(payload.states) ? payload.states : [];

    const normalizedFlights = states
      .filter((state) => Number.isFinite(state[5]) && Number.isFinite(state[6]))
      .map((state) => ({
        icao24: state[0],
        callsign: (state[1] || "").trim() || "UNKNOWN",
        originCountry: state[2],
        timePosition: state[3],
        lastContact: state[4],
        longitude: state[5],
        latitude: state[6],
        baroAltitude: state[7],
        onGround: state[8],
        velocity: state[9],
        trueTrack: state[10],
        verticalRate: state[11],
        geoAltitude: state[13],
        squawk: state[14],
        spi: state[15],
        positionSource: state[16]
      }));

    res.json({
      fetchedAt: payload.time,
      total: normalizedFlights.length,
      flights: normalizedFlights
    });
  } catch (err) {
    console.error("Live flight fetch failed:", err);
    res.status(500).json({ error: "Live tracker is temporarily unavailable" });
  }
});

// Return only live aircraft that match celebrity flight numbers.
app.get("/api/celebrity-live-flights", async (req, res) => {
  try {
    const lamin = Number.parseFloat(req.query.lamin);
    const lamax = Number.parseFloat(req.query.lamax);
    const lomin = Number.parseFloat(req.query.lomin);
    const lomax = Number.parseFloat(req.query.lomax);

    const hasBBox = [lamin, lamax, lomin, lomax].every((value) => Number.isFinite(value));

    const params = new URLSearchParams();
    if (hasBBox) {
      params.set("lamin", String(lamin));
      params.set("lamax", String(lamax));
      params.set("lomin", String(lomin));
      params.set("lomax", String(lomax));
    }

    const authUser = process.env.OPENSKY_USERNAME;
    const authPass = process.env.OPENSKY_PASSWORD;
    const authHeader = authUser && authPass
      ? { Authorization: `Basic ${Buffer.from(`${authUser}:${authPass}`).toString("base64")}` }
      : {};

    const url = `https://opensky-network.org/api/states/all${params.toString() ? `?${params.toString()}` : ""}`;

    const [openskyResponse, flightsResult] = await Promise.all([
      fetch(url, { headers: authHeader }),
      pool.query(`
        SELECT f.flightnumber, f.departureairport, f.arrivalairport, f.departuretime, f.arrivaltime, c.name AS celebrityname
        FROM flights f
        JOIN celebrities c ON f.celebrityid = c.celebrityid
      `)
    ]);

    if (!openskyResponse.ok) {
      return res.status(openskyResponse.status).json({
        error: "Failed to fetch live flights",
        details: `OpenSky response ${openskyResponse.status}`
      });
    }

    const payload = await openskyResponse.json();
    const states = Array.isArray(payload.states) ? payload.states : [];

    const normalize = (value) => (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const normalizeIcao24 = (value) => (value || "").toLowerCase().replace(/[^a-f0-9]/g, "");

    const nowMs = Date.now();
    const schedulesByCelebrity = new Map();
    for (const row of flightsResult.rows) {
      if (!row.celebrityname) {
        continue;
      }

      const departureMs = row.departuretime ? new Date(row.departuretime).getTime() : Number.NaN;
      const arrivalMs = row.arrivaltime ? new Date(row.arrivaltime).getTime() : Number.NaN;
      const referenceMs = Number.isFinite(departureMs) ? departureMs : (Number.isFinite(arrivalMs) ? arrivalMs : Number.NaN);
      const delta = Number.isFinite(referenceMs) ? Math.abs(referenceMs - nowMs) : Number.POSITIVE_INFINITY;

      const previous = schedulesByCelebrity.get(row.celebrityname);
      if (!previous || delta < previous.delta) {
        schedulesByCelebrity.set(row.celebrityname, {
          flightNumber: row.flightnumber,
          departureAirport: row.departureairport,
          arrivalAirport: row.arrivalairport,
          departureTime: row.departuretime,
          arrivalTime: row.arrivaltime,
          delta
        });
      }
    }

    let configuredAircraft = [];
    try {
      const rawConfig = process.env.CELEBRITY_AIRCRAFT;
      const parsedConfig = rawConfig ? JSON.parse(rawConfig) : [];
      configuredAircraft = Array.isArray(parsedConfig)
        ? parsedConfig
            .map((entry) => ({
              celebrityName: entry.celebrityName,
              icao24: normalizeIcao24(entry.icao24),
              tailNumber: normalize(entry.tailNumber),
              callsign: normalize(entry.callsign)
            }))
            .filter((entry) => entry.celebrityName && (entry.icao24 || entry.tailNumber || entry.callsign))
        : [];
    } catch (configErr) {
      return res.status(500).json({
        error: "Invalid CELEBRITY_AIRCRAFT configuration",
        details: "Expected JSON array with celebrityName and icao24/tailNumber"
      });
    }

    const flightsByNumber = flightsResult.rows
      .map((row) => ({
        ...row,
        normalizedFlightNumber: normalize(row.flightnumber)
      }))
      .filter((row) => row.normalizedFlightNumber.length > 0);

    const fallbackLookup = new Map();
    flightsByNumber.forEach((row) => {
      if (!fallbackLookup.has(row.normalizedFlightNumber)) {
        fallbackLookup.set(row.normalizedFlightNumber, []);
      }
      fallbackLookup.get(row.normalizedFlightNumber).push(row);
    });

    const buildPayload = (state, celebrityName, matchMode) => {
      const schedule = schedulesByCelebrity.get(celebrityName) || null;
      const etaMs = schedule?.arrivalTime ? (new Date(schedule.arrivalTime).getTime() - nowMs) : Number.NaN;
      const etaMinutes = Number.isFinite(etaMs) ? Math.round(etaMs / 60000) : null;

      return {
        icao24: state[0],
        callsign: (state[1] || "").trim() || "UNKNOWN",
        originCountry: state[2],
        timePosition: state[3],
        lastContact: state[4],
        longitude: state[5],
        latitude: state[6],
        baroAltitude: state[7],
        onGround: state[8],
        velocity: state[9],
        trueTrack: state[10],
        verticalRate: state[11],
        geoAltitude: state[13],
        squawk: state[14],
        spi: state[15],
        positionSource: state[16],
        celebrityName,
        scheduledFlightNumber: schedule?.flightNumber || null,
        departureAirport: schedule?.departureAirport || null,
        arrivalAirport: schedule?.arrivalAirport || null,
        scheduledDepartureTime: schedule?.departureTime || null,
        scheduledArrivalTime: schedule?.arrivalTime || null,
        etaMinutes,
        matchMode
      };
    };

    let celebrityFlights = [];
    let trackingMode = "adsb-identifiers";

    if (configuredAircraft.length > 0) {
      for (const state of states) {
        if (!Number.isFinite(state[5]) || !Number.isFinite(state[6])) {
          continue;
        }

        const stateIcao24 = normalizeIcao24(state[0]);
        const stateCallsign = normalize(state[1]);

        for (const configured of configuredAircraft) {
          const matchesIcao24 = configured.icao24 && configured.icao24 === stateIcao24;
          const matchesTail = configured.tailNumber && configured.tailNumber === stateCallsign;
          const matchesCallsign = configured.callsign && configured.callsign === stateCallsign;

          if (matchesIcao24 || matchesTail || matchesCallsign) {
            const matchMode = matchesIcao24 ? "icao24" : (matchesTail ? "tail-number" : "callsign");
            celebrityFlights.push(buildPayload(state, configured.celebrityName, matchMode));
            break;
          }
        }
      }
    } else {
      trackingMode = "flight-number-fallback";
      celebrityFlights = states
        .filter((state) => Number.isFinite(state[5]) && Number.isFinite(state[6]))
        .map((state) => {
          const normalizedCallsign = normalize(state[1]);
          const matches = fallbackLookup.get(normalizedCallsign) || [];

          if (matches.length === 0) {
            return null;
          }

          return matches.map((match) => buildPayload(state, match.celebrityname, "flight-number"));
        })
        .flat()
        .filter(Boolean);
    }

    res.json({
      fetchedAt: payload.time,
      trackedFlights: flightsByNumber.length,
      trackingMode,
      configuredAircraft: configuredAircraft.length,
      total: celebrityFlights.length,
      flights: celebrityFlights
    });
  } catch (err) {
    console.error("Celebrity live flight fetch failed:", err);
    res.status(500).json({ error: "Celebrity live tracker is temporarily unavailable" });
  }
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

// Create a new celebrity
app.post("/celebrities", async (req, res) => {
  const { name, profession, nationality } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO celebrities (name, profession, nationality) VALUES ($1,$2,$3) RETURNING *",
      [name, profession, nationality]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create celebrity" });
  }
});

// Update a celebrity
app.put("/celebrities/:id", async (req, res) => {
  const { name, profession, nationality } = req.body;
  try {
    const result = await pool.query(
      "UPDATE celebrities SET name=$1, profession=$2, nationality=$3 WHERE celebrityid=$4 RETURNING *",
      [name, profession, nationality, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Celebrity not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update celebrity" });
  }
});

// Delete a celebrity
app.delete("/celebrities/:id", async (req, res) => {
  try {
    // Remove their flights first to avoid FK violation
    await pool.query("DELETE FROM flights WHERE celebrityid=$1", [req.params.id]);
    const result = await pool.query("DELETE FROM celebrities WHERE celebrityid=$1 RETURNING *", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Celebrity not found" });
    res.json({ message: "Celebrity deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete celebrity" });
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

// Create a new plane model
app.post("/planes", async (req, res) => {
  const { manufacturer, modelname, manufacturingyear, capacity, maxrangekm } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO planemodels (manufacturer, modelname, manufacturingyear, capacity, maxrangekm) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [manufacturer, modelname, manufacturingyear, capacity, maxrangekm]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create plane model" });
  }
});

// Update a plane model
app.put("/planes/:id", async (req, res) => {
  const { manufacturer, modelname, manufacturingyear, capacity, maxrangekm } = req.body;
  try {
    const result = await pool.query(
      "UPDATE planemodels SET manufacturer=$1, modelname=$2, manufacturingyear=$3, capacity=$4, maxrangekm=$5 WHERE planeid=$6 RETURNING *",
      [manufacturer, modelname, manufacturingyear, capacity, maxrangekm, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Plane not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update plane model" });
  }
});

// Delete a plane model
app.delete("/planes/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM planemodels WHERE planeid=$1 RETURNING *", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Plane not found" });
    res.json({ message: "Plane model deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete plane model" });
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

