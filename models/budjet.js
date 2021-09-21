const mongoose = require("mongoose");

const budjetSchema = new mongoose.Schema({
  carID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Car",
  },
  total: {
    type: Number,
  },
  renter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("budjet", budjetSchema);
