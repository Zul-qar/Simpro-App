import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const jobCostCenterSchema = new Schema({
  ID: { type: Number, required: true },
  Name: { type: String, default: '' },
  CostCenter: {
    ID: Number,
    Name: String
  },
  Job: {
    ID: Number,
    Type: String,
    Stage: String,
    Status: String
  },
  Section: {
    ID: Number,
    Name: String
  },
  DateModified: Date,
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
});

export default mongoose.model('JobCostCenter', jobCostCenterSchema);
