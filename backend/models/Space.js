import mongoose from 'mongoose';

const { Schema } = mongoose;

const slugify = (text) =>
  text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const spaceSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 60 },
    slug: { type: String, unique: true },
    description: { type: String, maxlength: 300 },
    admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isPrivate: { type: Boolean, default: false },
    coverColor: { type: String, default: '#4F46E5' },
  },
  { timestamps: true }
);

spaceSchema.pre('save', async function () {
  if (!this.isModified('name') && this.slug) {
    return;
  }

  const base = slugify(this.name);
  let slug = base;
  let suffix = 2;

  while (await this.constructor.exists({ slug, _id: { $ne: this._id } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  this.slug = slug;
});

spaceSchema.index({ admin: 1 });

export default mongoose.model('Space', spaceSchema);
