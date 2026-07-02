import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    bio: { type: String, default: '', maxlength: 300 },
    avatarUrl: { type: String, default: '' },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    spacesJoined: [{ type: Schema.Types.ObjectId, ref: 'Space' }],
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
