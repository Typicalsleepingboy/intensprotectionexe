const express = require("express");
const cors = require("cors");
const routes = require("./routes/routes");
const { sendLogToDiscord } = require("./other/discordLogger");
const config = require("./main/config");
const rateLimit = require("express-rate-limit");

const app = express();
app.set('trust proxy', true);

const limiter = rateLimit({
  windowMs: 20 * 60 * 1000, 
  max: 200,
  handler: (req, res) => {
    const logMessage = `Rate limit reached for IP ${req.ip}.`;
    sendLogToDiscord(logMessage, "Warning");

    res.status(429).send({
      message: "Too many requests from this IP, please try again after 15 minutes."
    });
  }
});

app.use(limiter);

// Middleware untuk maintenance mode
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

// Middleware untuk logging request ke /api
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

// Middleware untuk enable maintenance mode
const enableMaintenanceMode = () => {
  // Check if maintenanceMode is already false
  if (!config.maintenanceMode) {
    const logMessage = "Maintenance mode disabled.";
    sendLogToDiscord(logMessage, "Info");
    return;
  }

  config.maintenanceMode;

  const logBeforeMessage = "Maintenance mode about to be disabled.";
  const logAfterMessage = "Maintenance mode enabled.";
  sendLogToDiscord(logBeforeMessage, "Info");
  sendLogToDiscord(logAfterMessage, "Info");
};

enableMaintenanceMode();

app.use(cors());

// Gunakan middleware apiLoggerMiddleware hanya untuk request ke /api
app.use("/api", apiLoggerMiddleware, routes);

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
