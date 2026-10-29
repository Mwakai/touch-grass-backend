require("dotenv").config();
const connectDB = require("./config/db");
const app = require("./app");

// Connect to database
connectDB();

// Start server
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   Touch Grass API - Authentication Server  ║
╚════════════════════════════════════════════╝

🚀 Server running in ${process.env.NODE_ENV || "development"} mode
📡 Port: ${PORT}
🔗 URL: http://localhost:${PORT}
📚 API Docs: http://localhost:${PORT}/


Press CTRL+C to stop
  `);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

module.exports = app;
