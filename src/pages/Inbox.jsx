import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import { FiUsers } from 'react-icons/fi'; // Import the users icon

const Inbox = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();

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
    if (!currentUserId) return;

    const fetchChats = async () => {
      setLoading(true);
      
      // Get all chats involving current user
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      if (chatsError) {
        console.error('Error fetching chats:', chatsError);
        setLoading(false);
        return;
      }

      // Group chats by chat_id and get the last message
      const uniqueChats = {};
      chatsData.forEach(chat => {
        if (!uniqueChats[chat.chat_id]) {
          uniqueChats[chat.chat_id] = chat;
        }
      });

      // Get profiles of all users chatted with
      const chatUsers = Object.values(uniqueChats).map(chat => 
        chat.sender_id === currentUserId ? chat.receiver_id : chat.sender_id
      );

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, profile_picture')
        .in('id', chatUsers);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setLoading(false);
        return;
      }

      // Combine chat data with user profiles
      const enrichedChats = Object.values(uniqueChats).map(chat => {
        const otherUserId = chat.sender_id === currentUserId ? chat.receiver_id : chat.sender_id;
        const profile = profilesData.find(p => p.id === otherUserId);
        
        return {
          ...chat,
          otherUser: profile || { name: 'Unknown', profile_picture: '' },
          lastMessage: chat.message,
          lastMessageTime: chat.created_at
        };
      });

      setChats(enrichedChats);
      setLoading(false);
    };

    fetchChats();

    // Setup realtime subscription for new chats
    const subscription = supabase
      .channel('inbox_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
          filter: `sender_id=eq.${currentUserId},receiver_id=eq.${currentUserId}`
        },
        (payload) => {
          // Update chat list when new message arrives
          setChats(prev => {
            const existingChat = prev.find(c => c.chat_id === payload.new.chat_id);
            if (existingChat) {
              return prev.map(c => 
                c.chat_id === payload.new.chat_id 
                  ? { 
                      ...c, 
                      lastMessage: payload.new.message,
                      lastMessageTime: payload.new.created_at
                    } 
                  : c
              ).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
            } else {
              // If new chat, fetch user profile
              const fetchNewChatUser = async () => {
                const otherUserId = payload.new.sender_id === currentUserId 
                  ? payload.new.receiver_id 
                  : payload.new.sender_id;
                
                const { data } = await supabase
                  .from('profiles')
                  .select('id, name, profile_picture')
                  .eq('id', otherUserId)
                  .single();

                return {
                  ...payload.new,
                  otherUser: data || { name: 'Unknown', profile_picture: '' },
                  lastMessage: payload.new.message,
                  lastMessageTime: payload.new.created_at
                };
              };

              fetchNewChatUser().then(newChat => {
                setChats(prev => [newChat, ...prev]);
              });

              return prev;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentUserId]);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return formatTime(dateString);
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin';
    } else {
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto mt-10 bg-white shadow-md rounded-2xl overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h1 className="text-xl font-bold">Pesan</h1>
          <button 
            onClick={() => navigate('/users')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
            aria-label="Lihat Pengguna"
          >
            <FiUsers className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center text-gray-500">
              <p>Memuat pesan...</p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {chats.length === 0 ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center text-gray-500">
                  <p>Belum ada pesan</p>
                </div>
              </div>
            ) : (
              chats.map(chat => (
                <div 
                  key={chat.chat_id}
                  className="flex items-center p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/chat/${chat.chat_id}`)}
                >
                  <img
                    src={chat.otherUser.profile_picture || 'https://via.placeholder.com/150'}
                    alt={chat.otherUser.name}
                    className="w-12 h-12 rounded-full object-cover mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">{chat.otherUser.name}</h3>
                      <span className="text-xs text-gray-500">
                        {formatDate(chat.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {chat.sender_id === currentUserId && 'Anda: '}
                      {chat.lastMessage}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Inbox;