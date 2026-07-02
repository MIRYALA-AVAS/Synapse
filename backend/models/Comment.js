import mongoose from 'mongoose';

const { Schema } = mongoose;

const commentSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: 'ForumPost', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 2000 },
    parent: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    depth: { type: Number, default: 0 },
    upvotes: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    downvotes: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
  },
  { timestamps: true }
);

commentSchema.pre('validate', async function () {
  if (!this.parent) {
    this.depth = 0;
    return;
  }

  const parentComment = await this.constructor.findById(this.parent).select('depth');
  if (!parentComment) {
    throw new Error('Parent comment not found');
  }
  if (parentComment.depth >= 1) {
    throw new Error('Comments can only be nested one level deep');
  }

  this.depth = parentComment.depth + 1;
});

commentSchema.index({ post: 1, parent: 1, createdAt: 1 });

export default mongoose.model('Comment', commentSchema);
