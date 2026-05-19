import { Router } from "express";
import {
	createBrand,
	getBrands,
	getBrandById,
	updateBrand,
	deleteBrand
} from "../controllers/brand.controller.js";
import { createUpload } from "../config/cloudinary.js";

const router = Router();
const upload = createUpload();

router.post("/", upload.single("logo"), createBrand);
router.get("/getAll", getBrands);
router.get("/:id", getBrandById);
router.put("/:id", upload.single("logo"), updateBrand);
router.delete("/:id", deleteBrand);

export default router;
