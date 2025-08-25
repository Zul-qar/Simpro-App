import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const catalogSchema = new Schema({
  ID: Number,
  PartNo: String,
  Name: String,
  Manufacturer: String,
  Group: {
    ID: Number,
    Name: String,
    ParentGroup: {
      ID: Number,
      Name: String
    }
  },
  Notes: String,
  DateModified: Date,
  Archived: Boolean,
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
});

export default mongoose.model('Catalog', catalogSchema);
