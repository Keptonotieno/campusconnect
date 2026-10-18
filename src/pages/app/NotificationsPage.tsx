import React from 'react';
import { useApp } from '../../context/AppContext';
import { Check } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { notifications, markAllNotificationsRead } = useApp();

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans space-y-6">
      {/* Header matching exact screenshot 7 */}
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Notifications</h2>
        <button
          onClick={markAllNotificationsRead}
          className="text-xs font-semibold text-[#1D64EC] hover:underline cursor-pointer"
        >
          Mark all read
        </button>
      </div>

      {/* Notifications list */}
      <div className="space-y-4 max-w-3xl mx-auto">
        {notifications.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-950">
                  {item.title}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                  {item.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              <span className="text-[11px] text-slate-400">{item.createdAt}</span>
              {!item.read && (
                <span className="w-2 h-2 rounded-full bg-[#1D64EC]" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
