import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
	{
		categoryName: { type: String, required: true, trim: true },
		slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
		description: { type: String, default: "" },
		image: { type: String, default: "" },
		parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
		isActive: { type: Boolean, default: true },
		sortOrder: { type: Number, default: 0 }
	},
	{ timestamps: true }
);

categorySchema.index({ parent: 1 });

const Category = mongoose.model("Category", categorySchema);
export default Category;
