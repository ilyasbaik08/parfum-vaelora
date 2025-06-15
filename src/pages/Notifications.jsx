import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get current user ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error.message);
        return;
      }
      if (user) setCurrentUserId(user.id);
    };

    fetchCurrentUser();
  }, []);

  // Fetch notifications and set up real-time subscription
  useEffect(() => {
    if (!currentUserId) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error.message);
        return;
      }

      setNotifications(data);
      setLoading(false);
    };

    fetchNotifications();

    // Set up real-time subscription for new notifications
    const subscription = supabase
      .channel(`realtime_notifications:user_id=eq.${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setNotifications((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setNotifications((prev) => 
              prev.filter(notif => notif.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentUserId]);

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto p-4 pt-20">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          </div>
          
          <div>
            {loading ? (
              <div className="p-6 text-center text-gray-500 text-lg">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-lg">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <div 
                    className="p-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-gray-800 text-lg">{notification.notif}</p>
                      <span className="text-sm text-gray-500 ml-4 whitespace-nowrap">
                        {new Date(notification.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    </div>
                  </div>
                  {index < notifications.length - 1 && (
                    <div className="border-t border-gray-100 mx-5"></div>
                  )}
                </React.Fragment>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Notifications;