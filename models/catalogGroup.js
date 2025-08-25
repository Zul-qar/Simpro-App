import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const catalogGroupSchema = new Schema({
  ID: {
    type: Number,
    required: true
  },
  Name: String,
  ParentGroup: {
    ID: Number,
    Name: String
  },
  DisplayOrder: Number,
  DateCreated: Date,
  DateModified: Date,
  IsThirdPartyGroup: Boolean,
  Archived: Boolean,
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
});

export default mongoose.model('CatalogGroup', catalogGroupSchema);
