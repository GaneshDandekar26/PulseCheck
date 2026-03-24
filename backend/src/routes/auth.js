const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';

const isEmailValid = (email) => typeof email === 'string' && /^\S+@\S+\.\S+$/.test(email);
const isPasswordValid = (password) => typeof password === 'string' && password.length >= 8;

router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};

  if (!isEmailValid(email) || !isPasswordValid(password)) {
    return res.status(400).json({ message: 'Invalid email or password' });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ email: email.toLowerCase(), passwordHash });

    return res.status(201).json({ id: user.id, email: user.email, createdAt: user.createdAt });
  } catch (error) {
    console.error('[auth] register failed', error);
    return res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!isEmailValid(email) || !isPasswordValid(password)) {
    return res.status(400).json({ message: 'Invalid email or password' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: 'JWT secret not configured' });
    }

    const token = jwt.sign({ email: user.email }, secret, {
      expiresIn: TOKEN_EXPIRY,
      subject: user.id,
    });

    return res.status(200).json({ token, user: { id: user.id, email: user.email, createdAt: user.createdAt } });
  } catch (error) {
    console.error('[auth] login failed', error);
    return res.status(500).json({ message: 'Login failed' });
  }
});

module.exports = router;
