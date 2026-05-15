import { Router } from "express";
import {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct
} from "../controllers/product.controller.js";
import { upload } from "../config/cloudinary.js";

const router = Router();

// Handles mainImage (1) + additionalImages (up to 3)
const uploadFields = upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "additionalImages", maxCount: 3 },
]);

router.post("/", uploadFields, createProduct);
router.get("/getAll", getProducts);
router.get("/:id", getProductById);
router.put("/:id", uploadFields, updateProduct);
router.delete("/:id", deleteProduct);

export default router;