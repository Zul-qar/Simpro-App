const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const quoteSchema = new Schema({
  ID: {
    type: Number,
    required: true
  },
  Description: {
    type: String,
    default: ''
  },
  Total: {
    ExTax: Number,
    Tax: Number,
    IncTax: Number
  },
  IsClosed: Boolean,
  DateIssued: String,
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
});

module.exports = mongoose.model('Quotes', quoteSchema);