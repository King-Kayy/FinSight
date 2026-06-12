import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as transactionService from '../services/transactionService';

const router = Router();
router.use(authenticateJWT);

router.get('/income', async (req, res, next) => {
  try {
    const records = await transactionService.listIncome(req.user!.id);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

router.post('/income', async (req, res, next) => {
  try {
    const record = await transactionService.createIncome(req.user!.id, req.body);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

router.put('/income/:id', async (req, res, next) => {
  try {
    const record = await transactionService.updateIncome(
      req.user!.id,
      parseInt(req.params.id),
      req.body
    );
    res.json(record);
  } catch (err) {
    next(err);
  }
});

router.delete('/income/:id', async (req, res, next) => {
  try {
    await transactionService.deleteIncome(req.user!.id, parseInt(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
