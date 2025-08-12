import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import User from '../models/user.js';

const signup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  bcrypt
    .hash(password, 12)
    .then(hashedPass => {
      const user = new User({ email, password: hashedPass });
      return user.save();
    })
    .then(result => {
      res.status(201).json({ message: 'User created successfully' });
    })
    .catch(err => {
      next(err);
    });
};

const login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  User.findOne({ email })
    .then(user => {
      if (!user) {
        const error = new Error('A user with this email could not be found');
        error.statusCode = 401;
        throw error;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then(doMatch => {
      if (!doMatch) {
        const error = new Error('Incorrect password');
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign({ userId: loadedUser._id, email: loadedUser.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.status(200).json({ message: 'Login successful', token });
    })
    .catch(err => next(err));
};

export { signup, login };
