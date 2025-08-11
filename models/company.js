const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const companySchema = new Schema({
  ID: {
    type: Number,
    required: true
  },
  Name: {
    type: String,
    required: true
  }
})

module.exports = mongoose.model('Company', companySchema);