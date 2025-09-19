import mongoose from "mongoose";

const Schema = mongoose.Schema;

const JobCostCenterCatalogSchema = new Schema({
  ID: {
    type: Number,
    required: true,
  },
  Catalog: {
    ID: { type: Number, default: null },
    PartNo: { type: String, default: null },
    Name: { type: String, default: null },

    // Make these optional + provide defaults
    BillableStatus: { type: String, default: "Unknown" },
    BasePrice: { type: Number, default: 0 },
    Markup: { type: Number, default: 0 },
    Discount: { type: Number, default: 0 },

    SellPrice: {
      ExTax: { type: Number, default: null },
      IncTax: { type: Number, default: null },
      ExDiscountExTax: { type: Number, default: null },
      ExDiscountIncTax: { type: Number, default: null },
    },
    Total: {
      Qty: { type: Number, default: null },
      Amount: { type: Number, default: null },
    },
    Claimed: {
      ToDate: { type: Date, default: null },
      Remaining: { type: Number, default: null },
    },
  },
  jobCostCenter: {
    type: Schema.Types.ObjectId,
    ref: "JobCostCenter",
    required: true,
  },
});

export default mongoose.model(
  "JobCostCenterCatalog",
  JobCostCenterCatalogSchema
);
