import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const vendorOrderCatalogSchema = new Schema({
  Catalog: {
    ID: Number,
    PartNo: String,
    Name: String
  },
  DueDate: {
    type: Date,
    default: null
  },
  Notes: String,
  Price: Number,
  DisplayOrder: Number,
  vendorOrder: {
    type: Schema.Types.ObjectId,
    ref: 'VendorOrder'
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company'
  }
});

export default mongoose.model('VendorOrderCatalog', vendorOrderCatalogSchema);
