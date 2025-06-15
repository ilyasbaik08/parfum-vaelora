import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar";
import EmojiPicker from "emoji-picker-react";

const Chat = () => {
  const { chat_id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [receiverProfile, setReceiverProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!chat_id || !currentUserId) return;

    const fetchMessagesAndReceiver = async () => {
      setLoading(true);

      // Get all messages in this chat
      const { data: messagesData, error: messagesError } = await supabase
        .from("chats")
        .select("*")
        .eq("chat_id", chat_id)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
        setLoading(false);
        return;
      }

      setMessages(messagesData);

      // Determine the receiver
      if (messagesData.length > 0) {
        const receiverId = 
          messagesData[0].sender_id === currentUserId 
            ? messagesData[0].receiver_id 
            : messagesData[0].sender_id;

        // Get receiver's profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("name, profile_picture, id")
          .eq("id", receiverId)
          .single();

        if (profileError) {
          console.error("Error fetching receiver profile:", profileError);
        } else {
          setReceiverProfile(profileData);
        }
      }

      // Mark all unread messages as read
      const unreadMessages = messagesData.filter(
        msg => msg.receiver_id === currentUserId && !msg.is_read
      );

      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(msg => msg.id);
        
        const { error: updateError } = await supabase
          .from("chats")
          .update({ is_read: true })
          .in("id", messageIds);

        if (updateError) {
          console.error("Error updating message status:", updateError);
        }
      }

      setLoading(false);
    };

    fetchMessagesAndReceiver();

    // Setup realtime subscription for new messages
    const subscription = supabase
      .channel(`chat:${chat_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chats",
          filter: `chat_id=eq.${chat_id}`
        },
        async (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          
          // If the new message is for the current user, mark it as read immediately
          if (payload.new.receiver_id === currentUserId) {
            const { error } = await supabase
              .from("chats")
              .update({ is_read: true })
              .eq("id", payload.new.id);
            
            if (error) {
              console.error("Error updating new message status:", error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [chat_id, currentUserId]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "" || !currentUserId || !chat_id) return;

    // Determine receiver_id from the first message
    let receiverId = null;
    if (messages.length > 0) {
      receiverId = 
        messages[0].sender_id === currentUserId 
          ? messages[0].receiver_id 
          : messages[0].sender_id;
    } else {
      console.error("Cannot determine message recipient");
      return;
    }

    const { error } = await supabase.from("chats").insert({
      chat_id,
      sender_id: currentUserId,
      receiver_id: receiverId,
      message: inputMessage,
      is_read: false // New messages are initially unread
    });

    if (error) {
      console.error("Error sending message:", error);
      return;
    }

    setInputMessage("");
    setShowEmojiPicker(false);
  };

  const onEmojiClick = (emojiData) => {
    setInputMessage(prev => prev + emojiData.emoji);
  };

  const handleProfileClick = () => {
    if (receiverProfile) {
      navigate(`/profile/${receiverProfile.id}`);
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto mt-10 bg-white shadow-md rounded-2xl p-4 sm:p-6">
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="text-center py-10">Memuat pesan...</div>
          </div>
        ) : (
          <>
            {receiverProfile && (
              <div 
                className="flex items-center mb-6 pb-4 border-b cursor-pointer"
                onClick={handleProfileClick}
              >
                <img
                  src={receiverProfile.profile_picture || 'https://via.placeholder.com/150'}
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover mr-3"
                />
                <h2 className="text-xl font-semibold">{receiverProfile.name}</h2>
              </div>
            )}

            <div className="h-96 overflow-y-auto mb-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.sender_id === currentUserId
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p>{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.sender_id !== currentUserId && !msg.is_read && (
                        <span className="ml-1 text-blue-500">•</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300"
              >
                😊
              </button>
              
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 z-10">
                  <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={350} />
                </div>
              )}
              
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Tulis pesan..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap"
                >
                  Kirim
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Chat;