const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: true,
      trim: true
    },
    last_name: {
      type: String,
      default: '',
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      // No es required porque los usuarios OAuth no tienen password local
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    provider: {
      type: String,
      enum: ['local', 'github'],
      default: 'local'
    },
    providerId: {
      type: String,
      default: null
    },
    avatar: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Método de instancia para comparar password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Middleware pre-save para hashear la password
userSchema.pre('save', async function (next) {
  // Solo hashear si la password fue modificada (o es nueva)
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// No retornar la password en las respuestas JSON
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
