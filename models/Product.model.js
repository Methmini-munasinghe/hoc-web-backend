import mongoose from "mongoose";
import crypto from "crypto";

const productVariantSchema = new mongoose.Schema(
	{
		size: { type: String, trim: true },
		stockQty: { type: Number, default: 0, min: 0 },
		skuSuffix: { type: String, trim: true }
	},
	{ _id: false }
);

const productSchema = new mongoose.Schema(
	{
		productName: {
			type: String,
			required: [true, "Product name is required"],
			trim: true,
			index: true
		},
		price: { type: Number, default: 0, min: 0 },
		item_count: { type: Number, default: 0, min: 0 },
		description: { type: String, trim: true },
		weight: { type: Number, default: 0 },
		color: { type: String, default: "N/A", trim: true },
		size: { type: String, default: "N/A", trim: true },
		isActive: { type: Boolean, default: true, index: true },
		categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
		brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
		mainImage: { type: String, required: [true, "Main image URL is required"], trim: true },
		additionalImages: { type: [String], default: [] },
		sellType: { type: String, trim: true },
		categoryType: { type: String, trim: true },
		specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
		tags: { type: [String], default: [] },
		rating: { type: Number, default: 0, min: 0 },
		reviewCount: { type: Number, default: 0, min: 0 },
		isFeatured: { type: Boolean, default: false },
		discountPercentage: { type: Number, default: 0, min: 0 },
		sku: { type: String, unique: true, index: true },

		// Keep existing helpers for backward compatibility
		pricing: {
			basePrice: { type: Number, default: 0, min: 0 },
			salePrice: { type: Number, default: 0, min: 0 },
			costPrice: { type: Number, default: 0, min: 0 },
			taxRate: { type: Number, default: 0, min: 0 },
			discount: { type: Number, default: 0, min: 0 }
		},

		variants: { type: [productVariantSchema], default: [] }
	},
	{
		timestamps: true
	}
);

// Auto-generate SKU in format PRD-<timestamp>-<RANDOM>
productSchema.pre("save", function () {
	if (!this.sku) {
		const ts = Date.now();
		const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
		this.sku = `PRD-${ts}-${rand}`;
	}
});

const Product = mongoose.model("Product", productSchema);
export default Product;
