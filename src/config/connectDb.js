const mongoose = require('mongoose');

const connectDb = async () => {
  try {
    // Reduce aggressive buffering and set timeouts to improve responsiveness
    mongoose.set('bufferCommands', false);
    const connect = await mongoose.connect(process.env.CONNECTION_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30s
      socketTimeoutMS: 45000, // 45s
      family: 4
    });

    console.log("Database Connected Successfully!", connect.connection.name);

    return connect;
  } catch (err) {
    console.error("Database Connection Error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDb;