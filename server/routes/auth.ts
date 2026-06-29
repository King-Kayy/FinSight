import { Router } from 'express';
import * as authService from '../services/authService';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, name, password } = req.body;
    const result = await authService.register(email, name, password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    await authService.resetPassword(email, newPassword);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
