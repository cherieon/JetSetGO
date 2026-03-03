const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// for frontend
app.use(express.static(path.join(__dirname, "public")));

// Test API
app.get("/api/test", (req, res) => {
  res.json({ message: "✈️" });
});

// Start
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server on ${PORT}`);
});