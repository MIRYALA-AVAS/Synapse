import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, Shield } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import { SPACE_COLORS } from '../../utils/constants';

export default function SpaceAdminPanel({ space, onClose, onUpdated, onDeleted }) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    description: space.description || '',
    isPrivate: space.isPrivate || false,
    coverColor: space.coverColor || SPACE_COLORS[0],
  });
  const [transferTo, setTransferTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const nonAdminMembers = space.members?.filter((m) => {
    const mid = m._id?.toString() ?? m.toString();
    return mid !== space.admin?._id?.toString() && mid !== space.admin?.toString();
  }) ?? [];

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/spaces/${space.slug}`, form);
      onUpdated?.(data.space);
      toast.success('Space updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update space');
    } finally {
      setSaving(false);
    }
  };

  const handleKick = async (memberId) => {
    try {
      await api.delete(`/spaces/${space.slug}/members/${memberId}`);
      onUpdated?.({ ...space, members: space.members.filter((m) => (m._id || m).toString() !== memberId) });
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove member');
    }
  };

  const handleTransfer = async () => {
    if (!transferTo) return;
    try {
      const { data } = await api.put(`/spaces/${space.slug}/admin`, { newAdminId: transferTo });
      onUpdated?.(data.space);
      toast.success('Admin transferred');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not transfer admin');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/spaces/${space.slug}`);
      await refreshUser();
      onDeleted?.();
      toast.success('Space deleted');
      navigate('/spaces');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete space');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Space Settings</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Settings */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  maxLength={300}
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
                      className="h-6 w-6 rounded-full transition hover:scale-110"
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
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${form.isPrivate ? 'left-4' : 'left-0.5'}`} />
                </div>
                <span className="text-sm text-gray-700">Private space</span>
              </label>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </section>

          {/* Members */}
          {nonAdminMembers.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">Members</h3>
              <ul className="space-y-2">
                {nonAdminMembers.map((m) => {
                  const id = m._id?.toString() ?? m.toString();
                  const name = m.name ?? id;
                  return (
                    <li key={id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar name={name} src={m.avatarUrl} size={28} />
                        <span className="text-sm text-gray-700">{name}</span>
                      </div>
                      <button
                        onClick={() => handleKick(id)}
                        className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove member"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Transfer admin */}
          {nonAdminMembers.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">Transfer Admin</h3>
              <div className="flex gap-2">
                <select
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                >
                  <option value="">Select member…</option>
                  {nonAdminMembers.map((m) => {
                    const id = m._id?.toString() ?? m.toString();
                    return <option key={id} value={id}>{m.name ?? id}</option>;
                  })}
                </select>
                <button
                  onClick={handleTransfer}
                  disabled={!transferTo}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  <Shield size={14} />
                  Transfer
                </button>
              </div>
            </section>
          )}

          {/* Delete */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-red-500 uppercase tracking-wide">Danger Zone</h3>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} />
                Delete this space
              </button>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="mb-3 text-sm text-red-700">This will permanently delete the space and all its messages. Are you sure?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
