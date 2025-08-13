import mongoose from "mongoose";

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
  DateIssued: Date,
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
});

export default mongoose.model('Quotes', quoteSchema);