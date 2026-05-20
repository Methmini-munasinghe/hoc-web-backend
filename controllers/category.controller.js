import mongoose from "mongoose";
import Category from "../models/Category.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

export const createCategory = async (req, res) => {
	try {
		const payload = { ...req.body };
		payload.categoryName = payload.name;
		if (payload.slug) {
			payload.slug = String(payload.slug).toLowerCase().trim().replace(/\s+/g, "-");
		}

		if (!payload.name || !payload.slug) {
			return res.status(400).json({
				success: false,
				message: "name and slug are required"
			});
		}

		if (typeof payload.sortOrder === "string") {
			payload.sortOrder = Number(payload.sortOrder);
		}

		if (payload.parent === "" || payload.parent === "null") {
			payload.parent = null;
		}

		if (payload.parent && !mongoose.Types.ObjectId.isValid(payload.parent)) {
			return res.status(400).json({ success: false, message: "Invalid parent category id" });
		}

		if (payload.parent) {
			const parentExists = await Category.findById(payload.parent);
			if (!parentExists) {
				return res.status(404).json({ success: false, message: "Parent category not found" });
			}
		}

		const imageFile = req.file;
		if (imageFile) {
			const imageUrl = await uploadToCloudinary(imageFile.buffer, "categories");
			payload.image = imageUrl;
		}

		const category = await Category.create(payload);
		return res.status(201).json({ success: true, data: category });
	} catch (error) {
		console.error("createCategory error:", error);
		if (error?.code === 11000) {
			const dup = error.keyValue || {};
			return res.status(409).json({ success: false, message: "Duplicate key", detail: dup });
		}
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const getCategories = async (req, res) => {
	try {
		const { page = 1, limit = 20, parent, q, includeInactive } = req.query;
		const filter = {};

		if (includeInactive !== "true") {
			filter.isActive = true;
		}

		if (parent === "null") {
			filter.parent = null;
		} else if (parent) {
			if (!mongoose.Types.ObjectId.isValid(parent)) {
				return res.status(400).json({ success: false, message: "Invalid parent category id" });
			}
			filter.parent = parent;
		}

		if (q) {
			filter.$or = [
				{ name: { $regex: q, $options: "i" } },
				{ slug: { $regex: q, $options: "i" } }
			];
		}

		const pageNumber = Number(page) || 1;
		const limitNumber = Number(limit) || 20;
		const skip = (pageNumber - 1) * limitNumber;

		const [items, total] = await Promise.all([
			Category.find(filter)
				.populate("parent", "name slug")
				.sort({ sortOrder: 1, createdAt: -1 })
				.skip(skip)
				.limit(limitNumber),
			Category.countDocuments(filter)
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

export const getCategoryById = async (req, res) => {
	try {
		const { id } = req.params;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ success: false, message: "Invalid category id" });
		}

		const category = await Category.findById(id).populate("parent", "name slug");

		if (!category) {
			return res.status(404).json({ success: false, message: "Category not found" });
		}

		return res.status(200).json({ success: true, data: category });
	} catch (error) {
		return res.status(500).json({ success: false, message: error.message });
	}
};

export const updateCategory = async (req, res) => {
	try {
		const { id } = req.params;
		const updateData = { ...req.body };
		updateData.categoryName = updateData.name;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ success: false, message: "Invalid category id" });
		}

		const existingCategory = await Category.findById(id);
		if (!existingCategory) {
			return res.status(404).json({ success: false, message: "Category not found" });
		}

		if (typeof updateData.sortOrder === "string") {
			updateData.sortOrder = Number(updateData.sortOrder);
		}

		if (updateData.parent === "" || updateData.parent === "null") {
			updateData.parent = null;
		}

		if (Object.prototype.hasOwnProperty.call(updateData, "parent")) {
			if (updateData.parent && !mongoose.Types.ObjectId.isValid(updateData.parent)) {
				return res.status(400).json({ success: false, message: "Invalid parent category id" });
			}

			if (updateData.parent && updateData.parent === id) {
				return res.status(400).json({ success: false, message: "Category cannot be its own parent" });
			}

			if (updateData.parent) {
				const parentExists = await Category.findById(updateData.parent);
				if (!parentExists) {
					return res.status(404).json({ success: false, message: "Parent category not found" });
				}
			}
		}
		if (req.file) {
			if (existingCategory.image) {
				await deleteFromCloudinary(existingCategory.image);
			}
			updateData.image = await uploadToCloudinary(req.file.buffer, "categories");
		}

		const category = await Category.findByIdAndUpdate(id, updateData, {
			new: true,
			runValidators: true
		}).populate("parent", "name slug");

		return res.status(200).json({ success: true, data: category });
	} catch (error) {
		if (error?.code === 11000) {
			return res.status(409).json({ success: false, message: "Category slug already exists" });
		}
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const deleteCategory = async (req, res) => {
	try {
		const { id } = req.params;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ success: false, message: "Invalid category id" });
		}

		const hasChildren = await Category.exists({ parent: id, isActive: true });
		if (hasChildren) {
			return res.status(400).json({
				success: false,
				message: "Cannot delete category with active sub-categories"
			});
		}

		const category = await Category.findByIdAndUpdate(
			id,
			{ isActive: false },
			{ new: true }
		);

		if (!category) {
			return res.status(404).json({ success: false, message: "Category not found" });
		}

		return res.status(200).json({
			success: true,
			data: category,
			message: "Category deleted successfully"
		});
	} catch (error) {
		return res.status(500).json({ success: false, message: error.message });
	}
};

export default {
	createCategory,
	getCategories,
	getCategoryById,
	updateCategory,
	deleteCategory
};
