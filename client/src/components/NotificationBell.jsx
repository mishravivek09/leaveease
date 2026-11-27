import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import API from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function NotificationBell() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    try {
      const res = await API.get("/notifications?limit=15");
      setUnreadCount(res.data.unreadCount || 0);
      setNotifications(res.data.notifications || []);
    } catch {
      // Ignore transient errors in header badge
    }
  };

  useEffect(() => {
    let active = true;
    API.get("/notifications?limit=15")
      .then((res) => {
        if (!active) return;
        setUnreadCount(res.data.unreadCount || 0);
        setNotifications(res.data.notifications || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [location.pathname]);

  const markRead = async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch {
      // Ignore
    }
  };

  const markAllRead = async () => {
    try {
      await API.patch("/notifications/read-all");
      fetchNotifications();
    } catch {
      // Ignore
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-2">
        <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 px-2 text-xs">
              <CheckCheck size={14} className="mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n._id}
                type="button"
                onClick={() => !n.readStatus && markRead(n._id)}
                className={`w-full rounded-lg p-2.5 text-left text-xs transition-colors ${
                  n.readStatus
                    ? "bg-transparent text-muted-foreground hover:bg-muted/50"
                    : "bg-primary/10 font-medium text-foreground hover:bg-primary/15"
                }`}
              >
                <p>{n.message}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(n.createdDate).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
