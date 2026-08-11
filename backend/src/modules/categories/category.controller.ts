import { Request, Response } from "express";
import { getAllCategories } from "./category.service";

export const getCategories = async (
  req: Request,
  res: Response
) => {
  try {
    const sort =
      req.query.sort === "name"
        ? "name"
        : "sequence";

    const categories = await getAllCategories(sort);

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error("Get categories error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch categories",
    });
  }
};