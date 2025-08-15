import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const vendorReceiptCatalogSchema = new Schema({
  ID: {
    type: Number,
    required: true
  },
  PartNo: String,
  Name: String,
  vendorReceipt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorReceipt',
    required: true
  },
  vendorOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorOrder',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
});

export default mongoose.model('VendorReceiptCatalog', vendorReceiptCatalogSchema);
