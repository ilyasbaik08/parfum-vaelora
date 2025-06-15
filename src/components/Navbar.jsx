import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Bell, Mail } from 'lucide-react';
import { useUser } from '../UserContext';
import { supabase } from '../supabaseClient';

const Navbar = () => {
  const { userName } = useUser();
  const [userId, setUserId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const navigate = useNavigate();
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch user ID on component mount
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };

    fetchUser();
  }, []);

  // Check for unread messages
  useEffect(() => {
    if (!userId) return;

    const checkUnreadMessages = async () => {
      const { count, error } = await supabase
        .from('chats')
        .select('*', { count: 'exact' })
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error checking unread messages:', error);
        return;
      }

      setHasUnreadMessages(count > 0);
      setUnreadCount(count);
    };

    // Initial check
    checkUnreadMessages();

    // Realtime subscription
    const subscription = supabase
      .channel('unread_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `receiver_id=eq.${userId}`
        },
        () => {
          checkUnreadMessages(); // Refresh when any change happens to user's messages
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchKeyword.trim() !== '') {
      navigate(`/search?keyword=${encodeURIComponent(searchKeyword.trim())}`);
    }
  };

  return (
    <nav className="bg-pinkmuda p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo - Hidden on small screens */}
        <div className="hidden md:flex flex-col flex-shrink-0">
          <Link to="/home" className="text-white font-medium font-cinzel text-2xl">
            VAELORA PARFUM
          </Link>
        </div>

        {/* Search bar */}
        <div className="flex-grow mx-0 md:mx-4 relative max-w-xl">
          <div className="flex items-center">
            <div className="relative w-full mx-4">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </span>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Cari produk..."
                className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-1 focus:ring-pinkmuda focus:border-pinkmuda transition"
              />
            </div>
          </div>
        </div>

        {/* Navigation icons */}
        <div className="flex items-center space-x-4 flex-shrink-0">
          {/* Messages with notification badge */}
          <Link to="/inbox" className="text-white relative">
            <Mail className="w-6 h-6" />
            {hasUnreadMessages && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          <Link to="/notifications" className="text-white">
            <Bell className="w-6 h-6" />
          </Link>
          
          <Link to="/carts" className="text-white">
            <ShoppingCart className="w-6 h-6" />
          </Link>

          {userName && (
            <div className="relative" ref={dropdownRef}>
              <div
                className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full hover:bg-green-100 transition cursor-pointer"
                onClick={() => setDropdownOpen(prev => !prev)}
              >
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden sm:inline text-sm text-gray-700 font-medium">Hi, {userName}</span>
              </div>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-50">
                  {userId && (
                    <Link
                      to={`/profile/${userId}`}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Profile
                    </Link>
                  )}
                  <Link
                    to="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      window.location.href = '/';
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;