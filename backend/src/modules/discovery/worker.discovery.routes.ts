import express from "express";

import {
  fetchWorkers,
  fetchWorkerById,
} from "./worker.discovery.controller";
import { getCategories } from "../worker/worker.controller";

const router = express.Router();

router.get("/", fetchWorkers);

router.get("/categories", getCategories);

router.get("/:id", fetchWorkerById);

export default router;
