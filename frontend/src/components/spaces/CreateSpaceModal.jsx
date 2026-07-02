import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { SPACE_COLORS } from '../../utils/constants';

export default function CreateSpaceModal({ onClose, onCreated }) {
  const { refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: '',
    description: '',
    isPrivate: false,
    coverColor: SPACE_COLORS[0],
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/spaces', form);
      await refreshUser();
      onCreated?.(data.space);
      onClose();
      toast.success(`Space "${data.space.name}" created`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create space');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Create a Space</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={50}
              required
              placeholder="e.g. DSA Study Group"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              maxLength={300}
              placeholder="What's this space about?"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Color</label>
            <div className="flex gap-2">
              {SPACE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, coverColor: color }))}
                  className="h-7 w-7 rounded-full transition hover:scale-110"
                  style={{
                    backgroundColor: color,
                    outline: form.coverColor === color ? `3px solid ${color}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={form.isPrivate}
                onChange={(e) => setForm((f) => ({ ...f, isPrivate: e.target.checked }))}
              />
              <div className={`h-5 w-9 rounded-full transition ${form.isPrivate ? 'bg-violet-600' : 'bg-gray-300'}`} />
              <div
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${form.isPrivate ? 'left-4' : 'left-0.5'}`}
              />
            </div>
            <span className="text-sm text-gray-700">Private space</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
