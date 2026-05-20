import mongoose from "mongoose";
import Brand from "../models/Brand.model.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

const normalizeSlug = (value) =>
	String(value).toLowerCase().trim().replace(/\s+/g, "-");

const normalizeBoolean = (value) => {
	if (typeof value === "string") {
		return value.toLowerCase() === "true";
	}
	return value;
};

export const createBrand = async (req, res) => {
	try {
		const payload = { ...req.body };

		if (req.file) {
			payload.logo = await uploadToCloudinary(req.file.buffer, "brands");
		}

		if (payload.slug) {
			payload.slug = normalizeSlug(payload.slug);
		}

		if (!payload.name || !payload.slug) {
			return res.status(400).json({
				success: false,
				message: "name and slug are required"
			});
		}

		payload.isActive = normalizeBoolean(payload.isActive ?? true);

		const brand = await Brand.create(payload);
		return res.status(201).json({ success: true, data: brand });
	} catch (error) {
		if (error?.code === 11000) {
			const dup = error.keyValue || {};
			return res.status(409).json({ success: false, message: "Duplicate key", detail: dup });
		}
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const getBrands = async (req, res) => {
	try {
		const { page = 1, limit = 20, q, includeInactive } = req.query;
		const filter = {};

		if (includeInactive !== "true") {
			filter.isActive = true;
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
			Brand.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNumber),
			Brand.countDocuments(filter)
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

export const getBrandById = async (req, res) => {
	try {
		const { id } = req.params;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ success: false, message: "Invalid brand id" });
		}

		const brand = await Brand.findById(id);

		if (!brand) {
			return res.status(404).json({ success: false, message: "Brand not found" });
		}

		return res.status(200).json({ success: true, data: brand });
	} catch (error) {
		return res.status(500).json({ success: false, message: error.message });
	}
};

export const updateBrand = async (req, res) => {
	try {
		const { id } = req.params;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ success: false, message: "Invalid brand id" });
		}

		const existingBrand = await Brand.findById(id);
		if (!existingBrand) {
			return res.status(404).json({ success: false, message: "Brand not found" });
		}

		const updateData = { ...req.body };

		if (req.file) {
			if (existingBrand.logo) {
				await deleteFromCloudinary(existingBrand.logo);
			}
			updateData.logo = await uploadToCloudinary(req.file.buffer, "brands");
		}

		if (updateData.slug) {
			updateData.slug = normalizeSlug(updateData.slug);
		}

		if (Object.prototype.hasOwnProperty.call(updateData, "isActive")) {
			updateData.isActive = normalizeBoolean(updateData.isActive);
		}

		const brand = await Brand.findByIdAndUpdate(id, updateData, {
			new: true,
			runValidators: true
		});

		return res.status(200).json({ success: true, data: brand });
	} catch (error) {
		if (error?.code === 11000) {
			return res.status(409).json({ success: false, message: "Brand slug already exists" });
		}
		return res.status(400).json({ success: false, message: error.message });
	}
};

export const deleteBrand = async (req, res) => {
	try {
		const { id } = req.params;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ success: false, message: "Invalid brand id" });
		}

		const brand = await Brand.findByIdAndUpdate(
			id,
			{ isActive: false },
			{ new: true }
		);

		if (!brand) {
			return res.status(404).json({ success: false, message: "Brand not found" });
		}

		return res.status(200).json({
			success: true,
			data: brand,
			message: "Brand deleted successfully"
		});
	} catch (error) {
		return res.status(500).json({ success: false, message: error.message });
	}
};

export default {
	createBrand,
	getBrands,
	getBrandById,
	updateBrand,
	deleteBrand
};
