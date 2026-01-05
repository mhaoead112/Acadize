import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { getStudentProgress } from "../services/assignment.service.js";

const router = express.Router();

// GET /api/student/my-progress
router.get("/my-progress", isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "student") {
      return res.status(403).json({ message: "Forbidden: Students only." });
    }

    const progress = await getStudentProgress(user.id);
    res.json(progress);
  } catch (error: any) {
    console.error("Error fetching student progress:", error);
    res.status(500).json({ message: error?.message || "Failed to fetch progress" });
  }
});

export default router;
