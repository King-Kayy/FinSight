import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as budgetService from '../services/budgetService';

const router = Router();
router.use(authenticateJWT);

router.get('/budgets', async (req, res, next) => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const records = await budgetService.listBudgets(req.user!.id, month, year);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

router.post('/budgets', async (req, res, next) => {
  try {
    const record = await budgetService.createBudget(req.user!.id, req.body);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

router.put('/budgets/:id', async (req, res, next) => {
  try {
    const record = await budgetService.updateBudget(
      req.user!.id,
      parseInt(req.params.id),
      req.body
    );
    res.json(record);
  } catch (err) {
    next(err);
  }
});

export default router;
