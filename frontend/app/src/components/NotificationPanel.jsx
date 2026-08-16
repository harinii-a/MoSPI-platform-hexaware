import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle, X, TrendingUp } from 'lucide-react';
import { auditApi } from '../api';

export default function NotificationPanel({ isOpen, onClose, datasetId }) {
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    try {
      const res = await auditApi.notifications(datasetId);
      setNotifications(res.data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      const id = setInterval(fetchNotifications, 5000);
      return () => clearInterval(id);
    }
  }, [isOpen, datasetId]);

  const markAsRead = async (notifId) => {
    try {
      await auditApi.markRead(notifId);
      fetchNotifications();
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'warning':
        return <TrendingUp className="w-5 h-5 text-amber-600" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 w-96 h-full bg-white shadow-sketch border-l-2 border-slate-900 z-50 flex flex-col animate-in">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-5 border-b-2 border-slate-900 bg-amber-50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-6 h-6 text-slate-900" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-black text-white border border-slate-900">
                {unreadCount}
              </span>
            )}
          </div>
          <h3 className="font-black text-slate-900 text-base">Alerts & Notifications</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-900 hover:bg-slate-200 p-1.5 rounded-xl border border-slate-900 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-bold text-xs">
            No notifications yet
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`p-4 rounded-2xl border-2 border-slate-900 cursor-pointer hover:bg-amber-50/50 transition-all shadow-sketch-sm ${
                n.read ? 'bg-white' : 'bg-blue-50/80'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs font-black truncate ${n.read ? 'text-slate-700' : 'text-slate-900'}`}>
                      {n.title}
                    </h4>
                    {!n.read && <span className="w-2.5 h-2.5 bg-blue-600 rounded-full border border-slate-900 shrink-0" />}
                  </div>
                  <p className="text-[11px] font-bold text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-400 font-bold mt-1.5 block">
                    {new Date(n.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
