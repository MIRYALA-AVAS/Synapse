export const calculateTrendScore = (post) => {
  const netVotes = post.upvotes.length - post.downvotes.length;
  const ageHours = (Date.now() - post.createdAt) / 3600000;
  return (netVotes + post.commentCount * 0.5) / Math.pow(ageHours + 2, 1.5);
};
