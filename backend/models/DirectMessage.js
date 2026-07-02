import mongoose from 'mongoose';

const { Schema } = mongoose;

const directMessageSchema = new Schema(
  {
    roomId: { type: String, required: true },
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 1000 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

directMessageSchema.statics.buildRoomId = function (userIdA, userIdB) {
  return [userIdA.toString(), userIdB.toString()].sort().join('-');
};

directMessageSchema.index({ roomId: 1, createdAt: -1 });

export default mongoose.model('DirectMessage', directMessageSchema);
