import mongoose from 'mongoose';

const { Schema } = mongoose;

const spaceMessageSchema = new Schema(
  {
    space: { type: Schema.Types.ObjectId, ref: 'Space', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 2000 },
    replyTo: { type: Schema.Types.ObjectId, ref: 'SpaceMessage', default: null },
  },
  { timestamps: true }
);

spaceMessageSchema.index({ space: 1, createdAt: -1 });

export default mongoose.model('SpaceMessage', spaceMessageSchema);
