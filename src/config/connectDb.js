const mongoose = require('mongoose');

const connectDb = async () => {
  try {
    // Reduce aggressive buffering and set timeouts to improve responsiveness
    mongoose.set('bufferCommands', false);
    const connect = await mongoose.connect(process.env.CONNECTION_STRING, {
      serverSelectionTimeoutMS: 30000, // 30s
      socketTimeoutMS: 45000, // 45s
      family: 4
    });

    console.log(`Database connected: ${connect.connection.name}`);

    return connect;
  } catch (err) {
    console.error(`Database connection failed: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDb;