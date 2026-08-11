const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never return passwordHash by default
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'player', 'spectator'],
        message: 'Role must be admin, player, or spectator',
      },
      default: 'spectator',
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

// --- Pre-save hook: hash password before saving ---
userSchema.pre('save', async function (next) {
  // Only hash if passwordHash field has been modified
  if (!this.isModified('passwordHash')) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// --- Instance method: compare candidate password with stored hash ---
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// --- Instance method: generate and hash password reset token ---
userSchema.methods.getResetPasswordToken = function () {
  // Generate random token
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire to 30 minutes from now
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000;

  // Return the unhashed token to be sent in the email
  return resetToken;
};

// --- Transform toJSON: remove passwordHash and __v from all JSON output ---
userSchema.set('toJSON', {
  transform: function (_doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
