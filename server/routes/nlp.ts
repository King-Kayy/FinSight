import { Router } from "express";
import { authenticateJWT } from "../middleware/auth";
import { parseTransaction } from "../services/nlpService";
import { ValidationError } from "../middleware/errors";

const router = Router();
router.use(authenticateJWT);

router.post("/transactions/parse", (req: any, res: any, next: any) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      throw new ValidationError("Text is required", "text");
    }
    const result = parseTransaction(text.trim());
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
