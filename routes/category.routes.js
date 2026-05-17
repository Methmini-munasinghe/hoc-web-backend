import { Router } from "express";
import {
	createCategory,
	getCategories,
	getCategoryById,
	updateCategory,
	deleteCategory
} from "../controllers/category.controller.js";
import { createUpload } from "../config/cloudinary.js";

const router = Router();

const upload = createUpload(); // isolated instance

router.post(
	"/",
	(req, res, next) => {
		console.log("→ Reached category route");
		console.log("→ Headers:", req.headers["content-type"]);
		next();
	},
	upload.any(),
	(err, req, res, next) => {
		if (err) {
			console.error("→ Multer error:", err.message);
			return res.status(400).json({ success: false, message: `Multer error: ${err.message}` });
		}
		next();
	},
	(req, res, next) => {
		console.log("→ Files received:", req.files);
		console.log("→ Body:", req.body);
		next();
	},
	createCategory
);
router.get("/getAll", getCategories);
router.get("/:id", getCategoryById);
router.put("/:id", upload.single("image"), updateCategory);
router.delete("/:id", deleteCategory);

export default router;
