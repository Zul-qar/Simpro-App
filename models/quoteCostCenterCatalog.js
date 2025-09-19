import mongoose from "mongoose";

const Schema = mongoose.Schema;

const quoteCostCenterCatalogSchema = new Schema({
  QuoteCostCenterID: {
    type: Schema.Types.ObjectId,
    ref: "QuoteCostCenter",
    required: true
  },
  Catalog: {
    ID: Number,
    PartNo: String,
    Name: String,
    TradePrice: Number,
    TradePriceEx: Number,
    TradePriceInc: Number
  },
  Quantity: { type: Number, default: 1 },
  DisplayOrder: Number,
  company: {
    type: Schema.Types.ObjectId,
    ref: "Company",
    required: true
  }
});

export default mongoose.model("QuoteCostCenterCatalog", quoteCostCenterCatalogSchema);
