import { ArrowBigUp, ArrowBigDown } from 'lucide-react';

export default function VoteButtons({ score, userVote, onVote, size = 'md' }) {
  const iconSize = size === 'sm' ? 16 : 20;

  const handleClick = (e, type) => {
    e.stopPropagation();
    onVote?.(userVote === type ? 'remove' : type);
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={(e) => handleClick(e, 'up')}
        aria-pressed={userVote === 'up'}
        aria-label="Upvote"
        className={`p-1 rounded hover:bg-gray-100 transition-colors ${
          userVote === 'up' ? 'text-violet-600' : 'text-gray-400'
        }`}
      >
        <ArrowBigUp size={iconSize} fill={userVote === 'up' ? 'currentColor' : 'none'} />
      </button>

      <span className="text-sm font-semibold text-gray-700 min-w-[1.5rem] text-center">{score}</span>

      <button
        type="button"
        onClick={(e) => handleClick(e, 'down')}
        aria-pressed={userVote === 'down'}
        aria-label="Downvote"
        className={`p-1 rounded hover:bg-gray-100 transition-colors ${
          userVote === 'down' ? 'text-red-500' : 'text-gray-400'
        }`}
      >
        <ArrowBigDown size={iconSize} fill={userVote === 'down' ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
