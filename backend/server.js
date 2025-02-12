require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const contractRoutes = require("./routes/contracts");
const authMiddleware = require("./middleware/authMiddleware");

const app = express();

// Middleware
app.use(express.json());
app.use(cors({ origin: "https://www.yourwixsite.com", credentials: true }));
app.use(authMiddleware); // Ensuring Wix API calls are authenticated

// Routes
app.use("/api/contracts", contractRoutes);

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(error => console.error("MongoDB Connection Error:", error));
