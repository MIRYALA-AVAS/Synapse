import mongoose from 'mongoose';

const { Schema } = mongoose;

export const TAGS = [
  'dsa',
  'placements',
  'academics',
  'internships',
  'time-management',
  'mental-health',
  'other',
];

const forumPostSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true },
    tags: { type: [String], enum: TAGS },
    upvotes: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    downvotes: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    voteScore: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    trendScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

forumPostSchema.pre('save', function () {
  if (this.isModified('upvotes') || this.isModified('downvotes')) {
    this.voteScore = this.upvotes.length - this.downvotes.length;
  }
});

forumPostSchema.index({ tags: 1, createdAt: -1 });
forumPostSchema.index({ voteScore: -1 });
forumPostSchema.index({ trendScore: -1 });

export default mongoose.model('ForumPost', forumPostSchema);
