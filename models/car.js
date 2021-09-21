const mongoose = require("mongoose");

const carSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  make: {
    type: String,
  },
  modal: {
    type: String,
  },
  year: {
    type: Number,
  },
  type: {
    type: String,
  },
  pricePerWeek: {
    type: Number,
  },
  pricePerHour: {
    type: Number,
  },
  image: [
    {
      imageUrl: {
        type: String,
      },
    },
  ],
  location: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  coords: {
    lat: {
      type: Number,
    },
    lng: {
      type: Number,
    },
  },
  picture: {
    type: String,
  },
  wallet: {
    type: Number,
  },
});

module.exports = mongoose.model("Car", carSchema);
