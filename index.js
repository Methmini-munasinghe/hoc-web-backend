import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import productRoutes from "./routes/product.routes.js";

const app = express();

app.use(express.json());

app.use("/api/products", productRoutes);
//error handler
app.use((err, req, res) => {
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


const PORT = process.env.PORT || 5000;

mongoose
    .connect(process.env.MONGO_URL)
    .then(() => {
        console.log("MongoDB connected successfully");
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Mongo connection error:", error.message);
    });

export default app; 