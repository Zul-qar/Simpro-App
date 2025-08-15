import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const prebuildCatalogSchema = new Schema({
  Catalog: {
    ID: { type: Number, required: true },
    PartNo: String,
    Name: String,
    TradePrice: Number,
    TradePriceEx: Number,
    TradePriceInc: Number,
    SplitPrice: Number,
    SplitPriceEx: Number,
    SplitPriceInc: Number
  },
  Quantity: Number,
  DisplayOrder: Number,
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  prebuild: { type: Schema.Types.ObjectId, ref: 'Prebuild', required: true }
});

export default mongoose.model('PrebuildCatalog', prebuildCatalogSchema);