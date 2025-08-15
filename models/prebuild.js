import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const prebuildSchema = new Schema({
  ID: {
    type: Number,
    required: true
  },
  _href: String,
  PartNo: String,
  Name: String,
  DisplayOrder: Number,
  Archived: Boolean,
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
});

export default mongoose.model('Prebuild', prebuildSchema);
