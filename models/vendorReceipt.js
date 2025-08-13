import mongoose from "mongoose";

const Schema = mongoose.Schema;

const vendorReceiptSchema = new Schema({
  ID: {
    type: Number,
    required: true
  }, 
  VendorInvoiceNo: String,
  DateIssued: String,
  DueDate: String,
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  vendorOrder: {
    type: Schema.Types.ObjectId,
    ref: 'VendorOrder',
    required: true
  }
});

export default mongoose.model('VendorReceipt', vendorReceiptSchema);