export const getUserVote = (item, userId) => {
  if (!userId || !item) return null;
  if (item.upvotes?.some((id) => id.toString() === userId.toString())) return 'up';
  if (item.downvotes?.some((id) => id.toString() === userId.toString())) return 'down';
  return null;
};

// Keeps upvotes/downvotes arrays consistent with a vote endpoint's
// { voteScore, userVote } response, so getUserVote keeps working on
// re-render without needing a refetch of the full document.
export const applyVoteResult = (item, userId, { voteScore, userVote }) => {
  const upvotes = item.upvotes.filter((id) => id.toString() !== userId.toString());
  const downvotes = item.downvotes.filter((id) => id.toString() !== userId.toString());
  if (userVote === 'up') upvotes.push(userId);
  if (userVote === 'down') downvotes.push(userId);
  return { ...item, upvotes, downvotes, voteScore };
};
