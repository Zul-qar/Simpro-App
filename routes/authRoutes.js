const express = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/authController');
const User = require('../models/user');
const checkValidation = require('../middlewares/checkValidation');

const router = express.Router();

router.post(
  '/signup',
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Email is not valid')
      .normalizeEmail()
      .custom(value => {
        return User.findOne({ email: value }).then(user => {
          if (user) {
            return Promise.reject('Email already exists');
          }
        });
      }),
    body('password')
      .trim()
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 5 })
      .withMessage('Password should contain at least five characters'),
    body('confirmPassword')
      .trim()
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 5 })
      .withMessage('Password should contain at least five characters')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      })
  ],
  checkValidation,
  authController.signup
);

router.post(
  '/login',
  [
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Email is not valid').normalizeEmail(),
    body('password')
      .trim()
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 5 })
      .withMessage('Password should contain at least five letters')
  ],
  checkValidation,
  authController.login
);

module.exports = router;
