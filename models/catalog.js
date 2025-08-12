import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const catalogSchema = new Schema({
  ID: {
    type: String,
    required: true
  },
  PartNo: String,
  Name: String,
  TradePrice: Number,
  TradePriceEx: Number,
  TradePriceInc: Number,
  SplitPrice: Number,
  SplitPriceEx: Number,
  SplitePriceInc: Number,
  company: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
});

export default mongoose.model('Catalog', catalogSchema);
