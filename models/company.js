import mongoose from "mongoose";

const Schema = mongoose.Schema;

const companySchema = new Schema({
  ID: {
    type: Number,
    required: true
  },
  Name: {
    type: String,
    required: true
  }
})

export default mongoose.model('Company', companySchema);