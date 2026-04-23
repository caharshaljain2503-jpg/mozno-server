import mongoose from "mongoose";

const db = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return true;
    }
    if (mongoose.connection.readyState === 2) {
      return true;
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      bufferTimeoutMS: 15000,
    });

    console.log("DB connected!");
    console.log("Host:", mongoose.connection.host);
    console.log("Database:", mongoose.connection.name);
    return true;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    // Keep server running so non-DB features (like market API) still work.
    return false;
  }
};

export default db;
