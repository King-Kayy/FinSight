import { Router } from "express";
import { authenticateJWT } from "../middleware/auth";
import * as savingsService from "../services/savingsService";

const router = Router();
router.use(authenticateJWT);

router.get("/savings-goals", async (req, res, next) => {
  try {
    const goals = await savingsService.listSavingsGoals(req.user!.id);
    res.json(goals);
  } catch (err) {
    next(err);
  }
});

router.post("/savings-goals", async (req, res, next) => {
  try {
    const goal = await savingsService.createSavingsGoal(req.user!.id, req.body);
    res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
});

router.put("/savings-goals/:id", async (req, res, next) => {
  try {
    const goal = await savingsService.updateSavingsGoal(
      req.user!.id,
      parseInt(req.params.id),
      req.body
    );
    res.json(goal);
  } catch (err) {
    next(err);
  }
});

router.delete("/savings-goals/:id", async (req, res, next) => {
  try {
    await savingsService.deleteSavingsGoal(req.user!.id, parseInt(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
