import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import brandRoutes from "./routes/brand.routes.js";
import { startDB } from "./db.js";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);
app.use(express.json());
app.use((req, res, next) => {
    next();
});
app.use("/api/products", productRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/brand", brandRoutes);
//error handler
app.use((err, req, res, next) => {
    if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
            success: false,
            message: "Image too large. Maximum size is 10MB per image",
        });
    }
    if (err.name === "MulterError") {
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }
    return res.status(500).json({
        success: false,
        message: err.message || "Internal server error",
    });
});


// Start DB and server
startDB(app).catch(() => process.exit(1));

export default app;