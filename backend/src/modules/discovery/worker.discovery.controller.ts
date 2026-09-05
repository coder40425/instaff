import { Request, Response } from "express";

import {
  getWorkers,
  getWorkerById,
} from "./worker.discovery.service";

export const fetchWorkers = async (
  req: Request,
  res: Response
) => {
  try {
    const rawIds =
      req.query.subCategoryIds as string | undefined;

    const subCategoryIds = rawIds
      ? rawIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    const workers = await getWorkers({
      categoryId:
        req.query.categoryId as string | undefined,

      subCategoryId:
        req.query.subCategoryId as string | undefined,

      subCategoryIds,

      search:
        req.query.search as string | undefined,

      city:
        req.query.city as string | undefined,

      isAvailable:
        req.query.isAvailable === "true"
          ? true
          : req.query.isAvailable === "false"
          ? false
          : undefined,

      sort:
        req.query.sort === "name"
          ? "name"
          : "sequence",
    });

    res.status(200).json({
      success: true,
      count: workers.length,
      data: workers,
    });
  } catch (error: any) {
    console.error("Fetch workers error:", error);

    res.status(400).json({
      success: false,
      message:
        error.message || "Failed to fetch workers",
    });
  }
};

export const fetchWorkerById = async (
  req: Request,
  res: Response
) => {
  try {
    const worker = await getWorkerById(
      req.params.id as string
    );

    res.status(200).json({
      success: true,
      data: worker,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};