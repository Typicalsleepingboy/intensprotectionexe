const express = require("express");
const cors = require("cors");
const routes = require("./routes/routes");
const { sendLogToDiscord } = require("./other/discordLogger");
const config = require("./main/config");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
app.set("trust proxy", true);

const NodeCache = require("node-cache");
const apiCache = new NodeCache({ stdTTL: 300 }); 

const limiter = rateLimit({
  windowMs: 20 * 60 * 1000,
  max: 200,
  handler: (req, res) => {
    const logMessage = `Rate limit reached for IP ${req.ip}.`;
    sendLogToDiscord(logMessage, "Warning");

    res.status(429).send({
      message: "Too many requests from this IP, please try again after 15 minutes.",
    });
  },
});

app.use(limiter);

app.use((req, res, next) => {
  if (config.maintenanceMode) {
    const logMessage = `Service temporarily unavailable due to maintenance. Request from ${req.ip} blocked.`;
    sendLogToDiscord(logMessage, "Error");
    res.status(503).send({
      message: "Service temporarily unavailable due to maintenance.",
    });
  } else {
    next();
  }
});

const apiLoggerMiddleware = (req, res, next) => {
  const startTime = new Date();

  res.on("finish", () => {
    const endTime = new Date();
    const responseTime = endTime - startTime;

    const requestData = {
      method: req.method,
      url: req.originalUrl,
      responseTime,
    };

    const logMessage = `Request handled successfully. Method: ${req.method}, URL: ${req.originalUrl}`;
    sendLogToDiscord(logMessage, "Info", requestData);
  });

  next();
};

const enableMaintenanceMode = () => {
  if (!config.maintenanceMode) {
    const logMessage = "Maintenance mode disabled.";
    sendLogToDiscord(logMessage, "Info");
    return;
  }

  const logBeforeMessage = "Maintenance mode about to be disabled.";
  const logAfterMessage = "Maintenance mode enabled.";
  sendLogToDiscord(logBeforeMessage, "Info");
  sendLogToDiscord(logAfterMessage, "Info");
};

enableMaintenanceMode();

app.use(cors());

const processingRequests = new Map();

app.use("/api", async (req, res, next) => {
  const cacheKey = req.originalUrl;
  
  const cachedData = apiCache.get(cacheKey);
  if (cachedData) {
    return res.json({ source: "cache", data: cachedData });
  }

  if (processingRequests.has(cacheKey)) {
    try {
      const result = await processingRequests.get(cacheKey);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  const processDataPromise = new Promise(async (resolve, reject) => {
    try {
      const result = await new Promise((resolveRoute, rejectRoute) => {
        const mockRes = {
          json: (data) => resolveRoute(data),
          status: () => mockRes
        };

        routes(req, mockRes, (err) => {
          if (err) rejectRoute(err);
        });
      });
      
      apiCache.set(cacheKey, result);
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      processingRequests.delete(cacheKey);
    }
  });

  processingRequests.set(cacheKey, processDataPromise);

  try {
    const result = await processDataPromise;
    res.json(result);
  } catch (error) {
    next(error);
  }
});


app.get('/cache-status', (req, res) => {
  const cacheKeys = apiCache.keys();
  const cacheStats = apiCache.getStats();
  
  res.json({
    totalKeys: cacheKeys.length,
    keys: cacheKeys,
    stats: cacheStats
  });
});


app.get("/", (req, res) => {
  const logMessage = `Welcome message sent to ${req.ip}.`;
  sendLogToDiscord(logMessage);
  res.send({
    message: "Lu mau nyari apa?? mending join discord intens aja",
    author: "https://github.com/typicalsleepingboy",
    discord: "https://discord.gg/48intenscommunity",
  });
});


app.listen(config.port, () => {
  console.log(`Server is running at http://localhost:${config.port}`);
});
