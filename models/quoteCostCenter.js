import mongoose from "mongoose";

const Schema = mongoose.Schema;

const quoteCostCenterSchema = new Schema({
  ID: { type: Number, required: true },
  Name: { type: String, default: "" },
  CostCenter: {
    ID: Number,
    Name: String
  },
  Quote: {
    ID: Number,
    Type: String,
    Name: String,
    Stage: String,
    Status: String
  },
  Section: {
    ID: Number,
    Name: String
  },
  DateModified: Date,
  _href: String,
  company: {
    type: Schema.Types.ObjectId,
    ref: "Company",
    required: true
  }
});

export default mongoose.model("QuoteCostCenter", quoteCostCenterSchema);
