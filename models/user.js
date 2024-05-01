const { Double } = require("mongodb");
const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    reset_token: {
      type: String,
      default: "",
    },
    verification_token: {
      type: String,
      default: new Date().getTime(),
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    uploaded: {
      type: Array,
      default: [],
    },
    sharedWithMe: {
      type: Array,
      default: [],
    },
    usedStorage:{
      type: Number,
      default: 0,
    }
  },
  {
    timestamps: true,
  }
);

const user = mongoose.model("users", userSchema);
module.exports = user;
