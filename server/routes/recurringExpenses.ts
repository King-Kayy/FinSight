import { Router } from "express";
import { authenticateJWT } from "../middleware/auth";
import * as recurringService from "../services/recurringService";

const router = Router();
router.use(authenticateJWT);

router.get("/recurring-expenses", async (req, res, next) => {
  try {
    const items = await recurringService.listRecurring(req.user!.id);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post("/recurring-expenses", async (req, res, next) => {
  try {
    const item = await recurringService.createRecurring(req.user!.id, req.body);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.put("/recurring-expenses/:id/deactivate", async (req, res, next) => {
  try {
    const item = await recurringService.deactivateRecurring(
      req.user!.id,
      parseInt(req.params.id)
    );
    res.json(item);
  } catch (err) {
    next(err);
  }
});

export default router;
