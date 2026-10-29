const express = require("express");
const cors = require("cors");
const path = require("path");
const { PRIVACY_POLICY_VERSION } = require("./config/privacy");
const errorHandler = require("./middleware/errorHandler");

// Import routes
const authRoutes = require("./routes/auth");
const kidRoutes = require("./routes/kids");
const gameRoutes = require("./routes/game");

/**
 * The Express app, without a database connection or a listening port, so
 * tests can run it against their own database. src/server.js starts it.
 */
const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/kids", kidRoutes);
app.use("/api/game", gameRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Privacy policy parents accept at signup and when adding a kid
app.get("/privacy", (req, res) => {
  res.set("X-Policy-Version", PRIVACY_POLICY_VERSION);
  res.type("text/markdown").sendFile(path.join(__dirname, "..", "PRIVACY.md"));
});

// Root route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Touch Grass API - Authentication Service",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      privacy: "/privacy",
      auth: {
        signup: "POST /api/auth/signup",
        login: "POST /api/auth/login",
        kidLogin: "POST /api/auth/kid-login",
        me: "GET /api/auth/me",
        deleteAccount: "DELETE /api/auth/me (parent)",
        logout: "POST /api/auth/logout",
      },
      kids: {
        addKid: "POST /api/kids",
        getKids: "GET /api/kids",
        getKid: "GET /api/kids/:id",
        updateKid: "PUT /api/kids/:id",
        deleteKid: "DELETE /api/kids/:id",
        setKidLogin: "PUT /api/kids/:id/login",
        myProfile: "GET /api/kids/me (kid)",
        updateMyProfile: "PUT /api/kids/me (kid)",
      },
      game: {
        myAdventure: "GET /api/game/me (kid)",
        submitChallenge: "POST /api/game/me/challenges/:challengeId (kid)",
        pending: "GET /api/game/pending (parent)",
        kidAdventure: "GET /api/game/kids/:id (parent)",
        review: "POST /api/game/completions/:id/review (parent)",
      },
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Every error ends up here
app.use(errorHandler);

module.exports = app;
