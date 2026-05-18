import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock AQI Prediction Logic (Simple Linear Regression simulation)
  app.get("/api/prediction", (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    // Simulate 24-hour prediction
    const predictions = [];
    const now = new Date();
    let baseAqi = 50 + Math.random() * 50; // Random base AQI

    for (let i = 1; i <= 24; i++) {
      const time = new Date(now.getTime() + i * 60 * 60 * 1000);
      // Add some "trend" and "noise"
      baseAqi += (Math.random() - 0.4) * 5; 
      predictions.push({
        timestamp: time.toISOString(),
        aqi: Math.max(0, Math.round(baseAqi))
      });
    }

    res.json(predictions);
  });

  // Proxy for WAQI API to avoid CORS and hide key
  app.get("/api/aqi", async (req, res) => {
    const { lat, lng, city } = req.query;
    const apiKey = process.env.WAQI_API_KEY;

    if (!apiKey || apiKey === "YOUR_WAQI_API_KEY") {
      return res.status(400).json({ 
        status: "error", 
        data: "WAQI_API_KEY is not configured. Please get a free token from https://aqicn.org/api/ and add it to your Secrets panel." 
      });
    }

    let url = "";
    if (lat && lng) {
      url = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${apiKey}`;
    } else if (city) {
      url = `https://api.waqi.info/feed/${city}/?token=${apiKey}`;
    } else {
      url = `https://api.waqi.info/feed/here/?token=${apiKey}`;
    }

    try {
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch air quality data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
