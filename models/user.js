const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  facebook: {
    type: String,
  },
  google: {
    type: String,
  },
  firstname: {
    type: String,
  },
  lastname: {
    type: String,
  },
  image: {
    type: String,
    default:
      "https://res.cloudinary.com/cobraaz/image/upload/v1595762337/gez4i626tlesoe3plwn7.jpg",
  },
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  online: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("User", userSchema);
