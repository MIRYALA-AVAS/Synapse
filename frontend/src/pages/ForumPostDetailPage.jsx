import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getUserVote, applyVoteResult } from '../utils/vote';
import { timeAgo } from '../utils/format';
import Avatar from '../components/common/Avatar';
import Tag from '../components/common/Tag';
import VoteButtons from '../components/common/VoteButtons';
import EmptyState from '../components/common/EmptyState';
import SkeletonCard from '../components/common/SkeletonCard';

function CommentItem({ comment, isReply, onVote, onReply }) {
  const { user } = useAuth();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const userVote = getUserVote(comment, user?._id);
  const score = comment.upvotes.length - comment.downvotes.length;

  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await onReply(replyText, comment._id);
      setReplyText('');
      setShowReplyBox(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={isReply ? 'mt-3 ml-10' : 'mt-4'}>
      <div className="flex gap-3">
        <VoteButtons score={score} userVote={userVote} onVote={(type) => onVote(comment._id, type)} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Avatar name={comment.author?.name} src={comment.author?.avatarUrl} size={20} />
            <Link to={`/profile/${comment.author?._id}`} className="text-sm font-medium text-gray-800 hover:text-violet-600 hover:underline">
              {comment.author?.name}
            </Link>
            <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-gray-700">{comment.body}</p>

          {!isReply && (
            <button
              type="button"
              onClick={() => setShowReplyBox((s) => !s)}
              className="mt-1 text-xs font-medium text-gray-400 hover:text-violet-600"
            >
              Reply
            </button>
          )}

          {showReplyBox && (
            <form onSubmit={submitReply} className="mt-2 flex gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                autoFocus
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                Reply
              </button>
            </form>
          )}
        </div>
      </div>

      {comment.replies?.map((reply) => (
        <CommentItem key={reply._id} comment={reply} isReply onVote={onVote} onReply={onReply} />
      ))}
    </div>
  );
}

export default function ForumPostDetailPage() {
  const { postId } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api
      .get(`/forum/${postId}`)
      .then(({ data }) => {
        setPost(data.post);
        setComments(data.comments);
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true);
        else toast.error('Could not load post');
      })
      .finally(() => setLoading(false));
  }, [postId]);

  // Live updates from other users
  useEffect(() => {
    if (!socket) return;

    const onVote = ({ postId: pid, voteScore }) => {
      if (pid.toString() !== postId) return;
      setPost((p) => p ? { ...p, voteScore } : p);
    };

    const onComment = ({ postId: pid, comment, parentId, commentCount }) => {
      if (pid.toString() !== postId) return;
      // Ignore if this comment was posted by the current user (already added optimistically)
      if (comment.author?._id?.toString() === user?._id?.toString()) return;
      setPost((p) => p ? { ...p, commentCount } : p);
      setComments((prev) => {
        if (parentId) {
          return prev.map((c) =>
            c._id.toString() === parentId.toString()
              ? { ...c, replies: [...(c.replies ?? []), comment] }
              : c
          );
        }
        return [...prev, { ...comment, replies: [] }];
      });
    };

    socket.on('post_vote_updated', onVote);
    socket.on('new_comment', onComment);

    return () => {
      socket.off('post_vote_updated', onVote);
      socket.off('new_comment', onComment);
    };
  }, [socket, postId, user?._id]);

  const handlePostVote = async (type) => {
    try {
      const { data } = await api.put(`/forum/${postId}/vote`, { type });
      setPost((p) => applyVoteResult(p, user._id, data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not vote');
    }
  };

  const handleCommentVote = async (commentId, type) => {
    try {
      const { data } = await api.put(`/forum/comments/${commentId}/vote`, { type });
      setComments((prev) =>
        prev.map((c) => {
          if (c._id === commentId) return applyVoteResult(c, user._id, data);
          return { ...c, replies: c.replies.map((r) => (r._id === commentId ? applyVoteResult(r, user._id, data) : r)) };
        })
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not vote');
    }
  };

  const handleAddComment = async (body, parentId = null) => {
    try {
      const { data } = await api.post(`/forum/${postId}/comments`, { body, parentId });
      setComments((prev) =>
        parentId
          ? prev.map((c) => (c._id === parentId ? { ...c, replies: [...c.replies, data.comment] } : c))
          : [...prev, { ...data.comment, replies: [] }]
      );
      setPost((p) => ({ ...p, commentCount: p.commentCount + 1 }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add comment');
      throw err;
    }
  };

  const handleSubmitTopLevel = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await handleAddComment(newComment);
      setNewComment('');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <EmptyState title="Post not found" description="This post may have been deleted." />
      </div>
    );
  }

  const userVote = getUserVote(post, user?._id);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex gap-4 border-b border-gray-100 pb-6">
        <VoteButtons score={post.voteScore} userVote={userVote} onVote={handlePostVote} />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Avatar name={post.author?.name} src={post.author?.avatarUrl} size={24} />
            <Link to={`/profile/${post.author?._id}`} className="text-sm text-gray-600 hover:text-violet-600 hover:underline">
              {post.author?.name}
            </Link>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-400">{timeAgo(post.createdAt)}</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{post.title}</h1>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{post.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {post.tags?.map((tag) => <Tag key={tag} tag={tag} />)}
          </div>
        </div>
      </div>

      <div className="py-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">
          {post.commentCount} comment{post.commentCount === 1 ? '' : 's'}
        </h2>

        {comments.length === 0 ? (
          <EmptyState title="No comments yet" description="Be the first to share your thoughts." />
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment._id} comment={comment} onVote={handleCommentVote} onReply={handleAddComment} />
          ))
        )}
      </div>

      <form onSubmit={handleSubmitTopLevel} className="border-t border-gray-100 pt-4">
        <label htmlFor="new-comment" className="mb-1 block text-sm font-medium text-gray-700">
          Add a comment
        </label>
        <textarea
          id="new-comment"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Share your thoughts..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <button
          type="submit"
          disabled={submittingComment}
          className="mt-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {submittingComment ? 'Posting...' : 'Comment'}
        </button>
      </form>
    </div>
  );
}
