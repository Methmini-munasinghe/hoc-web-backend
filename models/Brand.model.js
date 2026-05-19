import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
		logo: { type: String, default: "" },
		description: { type: String, default: "" },
		website: { type: String, default: "" },
		isActive: { type: Boolean, default: true }
	},
	{ timestamps: true }
);

const Brand = mongoose.model("Brand", brandSchema);
export default Brand;
