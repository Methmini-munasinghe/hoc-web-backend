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
		const { page = 1, limit = 20, status, category, q } = req.query;
		const filter = {};
		filter.isActive = true;

		if (status) {
			filter.status = status;
		}

		if (category) {
			filter.category = category;
		}

		if (q) {
			filter.productName = { $regex: q, $options: "i" };
		}

		const pageNumber = Number(page) || 1;
		const limitNumber = Number(limit) || 20;
		const skip = (pageNumber - 1) * limitNumber;

		const [items, total] = await Promise.all([
			Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNumber),
			Product.countDocuments(filter)
		]);

		return res.status(200).json({
			success: true,
			data: items,
			meta: { total, page: pageNumber, limit: limitNumber }
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
