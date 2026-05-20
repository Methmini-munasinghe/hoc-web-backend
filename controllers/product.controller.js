import mongoose from "mongoose";
import Product from "../models/Product.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

export const createProduct = async (req, res) => {
	try {
		const mainImageFile = req.files?.mainImage?.[0];
		const additionalImages = req.files?.additionalImages || [];

		if (!mainImageFile) {
			return res.status(400).json({ success: false, message: "Main image is required" });
		}

		const mainImageUrl = await uploadToCloudinary(mainImageFile.buffer);

		const additionalImageUrls = await Promise.all(
			additionalImages.map((f) => uploadToCloudinary(f.buffer))
		);

		const productData = {
			...req.body,
			mainImage: mainImageUrl,
			additionalImages: additionalImageUrls,
		};

		if (typeof productData.variants === "string") {
			productData.variants = JSON.parse(productData.variants);
		}
		if (typeof productData.pricing === "string") {
			productData.pricing = JSON.parse(productData.pricing);
		}

		if (typeof productData.price === "string") productData.price = Number(productData.price);
		if (typeof productData.item_count === "string") productData.item_count = Number(productData.item_count);
		const product = await Product.create(productData);
		return res.status(201).json({ success: true, data: product });
	} catch (error) {
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const getProducts = async (req, res) => {
	try {
		const {
			page = 1,
			limit = 20,
			q,
			categoryId,
			categoryLabel,
			includeInactive,
			status,
			featured,
			sort
		} = req.query;
		const filter = {};
		const LOW_STOCK_THRESHOLD = 5;
		const andFilters = [];

		if (includeInactive !== "true") {
			filter.isActive = true;
		}

		if (categoryId || categoryLabel) {
			const categoryMatch = [];
			if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
				categoryMatch.push({ categoryId });
			}
			if (categoryLabel) {
				categoryMatch.push({ categoryType: { $regex: categoryLabel, $options: "i" } });
			}
			if (categoryMatch.length) {
				andFilters.push({ $or: categoryMatch });
			}
		}

		if (q) {
			andFilters.push({
				$or: [
					{ productName: { $regex: q, $options: "i" } },
					{ sku: { $regex: q, $options: "i" } },
					{ categoryType: { $regex: q, $options: "i" } }
				]
			});
		}

		if (status) {
			switch (status) {
				case "active":
					filter.isActive = true;
					filter.item_count = { $gt: LOW_STOCK_THRESHOLD };
					break;
				case "low":
					filter.isActive = true;
					filter.item_count = { $gt: 0, $lte: LOW_STOCK_THRESHOLD };
					break;
				case "out":
					filter.isActive = true;
					filter.item_count = 0;
					break;
				case "draft":
					filter.isActive = false;
					break;
				default:
					break;
			}
		}

		if (featured === "true") {
			filter.isFeatured = true;
		}
		if (featured === "false") {
			filter.isFeatured = false;
		}

		if (andFilters.length) {
			filter.$and = andFilters;
		}

		const pageNumber = Number(page) || 1;
		const limitNumber = Number(limit) || 20;
		const skip = (pageNumber - 1) * limitNumber;

		const sortMap = {
			newest: { createdAt: -1 },
			oldest: { createdAt: 1 },
			"price-asc": { price: 1 },
			"price-desc": { price: -1 },
			"stock-asc": { item_count: 1 },
			"stock-desc": { item_count: -1 },
			"name-asc": { productName: 1 },
			"name-desc": { productName: -1 }
		};
		const sortOption = sortMap[sort] || { createdAt: -1 };

		const [items, total, totalAll, activeListings, outOfStock, drafts] = await Promise.all([
			Product.find(filter).sort(sortOption).skip(skip).limit(limitNumber),
			Product.countDocuments(filter),
			Product.countDocuments({}),
			Product.countDocuments({
				isActive: true,
				item_count: { $gt: LOW_STOCK_THRESHOLD }
			}),
			Product.countDocuments({
				isActive: true,
				item_count: 0
			}),
			Product.countDocuments({
				isActive: false
			})
		]);

		return res.status(200).json({
			success: true,
			data: items,
			meta: {
				total,
				page: pageNumber,
				limit: limitNumber,
				stats: {
					total: totalAll,
					activeListings,
					outOfStock,
					drafts
				}
			}
		});
	} catch (error) {
		return res.status(500).json({ success: false, message: error.message });
	}
};

export const getProductById = async (req, res) => {
	try {
		const { id } = req.params;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ success: false, message: "Invalid product id" });
		}

		const product = await Product.findById(id);

		if (!product) {
			return res.status(404).json({ success: false, message: "Product not found" });
		}

		return res.status(200).json({ success: true, data: product });
	} catch (error) {
		return res.status(500).json({ success: false, message: error.message });
	}
};


export const updateProduct = async (req, res) => {
	try {
		const { id } = req.params;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ success: false, message: "Invalid product id" });
		}

		const existingProduct = await Product.findById(id);
		if (!existingProduct) {
			return res.status(404).json({ success: false, message: "Product not found" });
		}

		const updateData = { ...req.body };

		if (req.files?.mainImage?.[0]) {
			if (existingProduct.mainImage) {
				await deleteFromCloudinary(existingProduct.mainImage);
			}
			updateData.mainImage = await uploadToCloudinary(req.files.mainImage[0].buffer);
		}

		if (req.files?.additionalImages?.length) {
			const uploaded = await Promise.all(req.files.additionalImages.map((f) => uploadToCloudinary(f.buffer)));
			if (existingProduct.additionalImages?.length) {
				await Promise.all(existingProduct.additionalImages.map(deleteFromCloudinary));
			}
			updateData.additionalImages = uploaded;
		}

		if (typeof updateData.variants === "string") {
			updateData.variants = JSON.parse(updateData.variants);
		}
		if (typeof updateData.pricing === "string") {
			updateData.pricing = JSON.parse(updateData.pricing);
		}

		// Normalize numeric fields
		if (typeof updateData.price === "string") updateData.price = Number(updateData.price);
		if (typeof updateData.item_count === "string") updateData.item_count = Number(updateData.item_count);

		const product = await Product.findByIdAndUpdate(id, updateData, {
			new: true,
			runValidators: true,
		});

		return res.status(200).json({ success: true, data: product });
	} catch (error) {
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const deleteProduct = async (req, res) => {
	try {
		const { id } = req.params;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ success: false, message: "Invalid product id" });
		}

		const product = await Product.findByIdAndUpdate(
			id,
			{ isActive: false },
			{ new: true }
		);

		if (!product) {
			return res.status(404).json({ success: false, message: "Product not found" });
		}

		return res.status(200).json({ success: true, data: product, message: "Product deleted successfully" });
	} catch (error) {
		return res.status(500).json({ success: false, message: error.message });
	}
};

export default {
	createProduct,
	getProducts,
	getProductById,
	updateProduct,
	deleteProduct
};
