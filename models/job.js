import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const jobSchema = new Schema({
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
  DateIssued: String,
  Stage: String,
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
});

export default mongoose.model('Job', jobSchema);
