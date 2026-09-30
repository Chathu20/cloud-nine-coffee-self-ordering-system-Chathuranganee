import dns from "node:dns";
import mongoose from "mongoose";

// Use public DNS servers for the mongodb+srv lookup.
// Some routers/ISPs refuse SRV queries, causing "querySrv ECONNREFUSED".
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;