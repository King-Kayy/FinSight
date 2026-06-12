import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as transactionService from '../services/transactionService';

const router = Router();
router.use(authenticateJWT);

router.get('/expenses', async (req, res, next) => {
  try {
    const records = await transactionService.listExpenses(req.user!.id);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

router.post('/expenses', async (req, res, next) => {
  try {
    const record = await transactionService.createExpense(req.user!.id, req.body);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

router.put('/expenses/:id', async (req, res, next) => {
  try {
    const record = await transactionService.updateExpense(
      req.user!.id,
      parseInt(req.params.id),
      req.body
    );
    res.json(record);
  } catch (err) {
    next(err);
  }
});

router.delete('/expenses/:id', async (req, res, next) => {
  try {
    await transactionService.deleteExpense(req.user!.id, parseInt(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
