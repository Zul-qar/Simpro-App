import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const vendorOrderSchema = new Schema({
  ID: {
    type: Number,
    required: true
  },
  Stage: String,
  Reference: String,
  ShowItemDueDate: Boolean,
  Totals: {
    ExTax: Number,
    IncTax: Number
  },
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
});

export default mongoose.model('VendorOrder', vendorOrderSchema);
