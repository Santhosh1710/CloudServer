const mongoose = require("mongoose");
const link = new mongoose.Schema(
  {
    hash: {
      type: String,
      required: true,
    },
    file: {
      type: Object,
      required: true,
    },
    uploadedBy: 
      {
        _id: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        email: {
          type: String,
          required: true,
        }
      }
  },
  {
    timestamps: true,
  }
);

const publiclinks = mongoose.model("public_links", link);
module.exports = publiclinks;
