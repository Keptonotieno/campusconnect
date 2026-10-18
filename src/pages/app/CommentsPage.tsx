import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  MessageCircle, 
  Search, 
  Send, 
  EyeOff, 
  Trash2, 
  Check, 
  ExternalLink,
  ShieldAlert,
  Filter,
  Instagram
} from 'lucide-react';

export const CommentsPage: React.FC = () => {
  const { 
    comments, 
    replyToComment, 
    deleteComment, 
    hideComment, 
    selectedAccount,
    navigateTo,
    accounts,
    setOAuthModalOpen
  } = useApp();

  const [filter, setFilter] = useState<'ALL' | 'UNANSWERED' | 'REPLIED' | 'FLAGGED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  const filteredComments = comments.filter((c) => {
    if (filter === 'UNANSWERED' && c.status !== 'UNANSWERED') return false;
    if (filter === 'REPLIED' && c.status !== 'REPLIED') return false;
    if (filter === 'FLAGGED' && c.status !== 'FLAGGED') return false;
    if (searchTerm) {
      return (
        c.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.fromUsername.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  const handleSendReply = (commentId: string) => {
    const text = replyInputs[commentId]?.trim();
    if (!text) return;
    replyToComment(commentId, text);
    setReplyInputs((prev) => ({ ...prev, [commentId]: '' }));
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-5xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Instagram Comments Moderation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor, moderate, and reply to audience comments across your feed posts
            {selectedAccount && ` for @${selectedAccount.username}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-[#1D64EC] border border-blue-200/60 text-xs font-bold font-mono">
            {comments.length} total comments
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'UNANSWERED', 'REPLIED', 'FLAGGED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                filter === tab
                  ? 'bg-blue-50 text-[#1D64EC] border border-blue-200/60'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab === 'ALL' ? 'All Comments' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username or comment..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Comments List */}
      {filteredComments.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-slate-200/90 shadow-xs text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mx-auto">
            <MessageCircle className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Comments Found</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {accounts.length === 0 
              ? 'Connect your Instagram account to view and moderate live comments.'
              : 'All comments matching your filter have been addressed.'}
          </p>
          {accounts.length === 0 && (
            <div className="pt-2">
              <button
                onClick={() => setOAuthModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#1D64EC] hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
              >
                Connect Instagram
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComments.map((comment) => (
            <div
              key={comment.id}
              className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  {/* Post thumbnail */}
                  <img
                    src={comment.postThumbnail}
                    alt="Post"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                  />

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900">
                        @{comment.fromUsername}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        comment.status === 'UNANSWERED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : comment.status === 'REPLIED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {comment.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      "{comment.text}"
                    </p>
                  </div>
                </div>

                {/* Moderation Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => hideComment(comment.id)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                    title="Hide comment on Instagram"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                    title="Delete comment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Replies Thread */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="pl-12 space-y-2 pt-2 border-t border-slate-100">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1D64EC]">
                          @{reply.fromAccount} (You)
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{reply.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Reply Input */}
              <div className="pl-12 pt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={replyInputs[comment.id] || ''}
                  onChange={(e) => setReplyInputs((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendReply(comment.id);
                    }
                  }}
                  placeholder={`Reply publicly to @${comment.fromUsername}...`}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                <button
                  onClick={() => handleSendReply(comment.id)}
                  disabled={!replyInputs[comment.id]?.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#1D64EC] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Send className="w-3 h-3" />
                  <span>Reply</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};
