const mongoose = require("mongoose");
mongoose.connect(process.env.Mongo_URL);

const connection = mongoose.connection;

connection.on("connected", () => {
  console.log("MongoDB connection is successful");
});

connection.on("error", (error) => {
  console.log("Error connecting to MongoDB : ", error);
});

module.exports = mongoose;
