import mongoose from "mongoose";

export async function startDB(app) {
    const PORT = process.env.PORT || 5000;

    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("MongoDB connected");
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Mongo connection error:", error.message);
        throw error;
    }
}

export default startDB;
