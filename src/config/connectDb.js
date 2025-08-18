const mongoose = require('mongoose');

const connectDb = async () => {
  try {
    const connect = await mongoose.connect(process.env.CONNECTION_STRING);
    
    console.log("Database Connected Successfully!", connect.connection.name);

    return connect;
  } catch (err) {
    console.error("Database Connection Error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDb;