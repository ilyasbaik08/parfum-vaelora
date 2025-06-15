import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
    const fetchUsers = async () => {
      setLoading(true);
      setError('');

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, profile_picture, gender, created_at');

        if (error) {
          throw error;
        }

        const filteredUsers = data.filter(user => user.id !== currentUserId);
        setUsers(filteredUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Gagal memuat daftar pengguna');
      } finally {
        setLoading(false);
      }
    };

    if (currentUserId) {
      fetchUsers();
    }
  }, [currentUserId]);

  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <>
      <Navbar />
      {loading ? (
        <div className="max-w-3xl mx-auto p-6 pt-24 text-center text-lg text-gray-500">
          Memuat pengguna...
        </div>
      ) : error ? (
        <div className="max-w-3xl mx-auto p-6 pt-24 text-center text-lg text-red-500">
          {error}
        </div>
      ) : (
        <div className="max-w-3xl mx-auto p-4 pt-20">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h1 className="text-2xl font-bold text-gray-800">Users</h1>
            </div>
            
            <div>
              {users.length === 0 ? (
                <div className="p-6 text-center text-lg text-gray-500">
                  Tidak ada pengguna lain
                </div>
              ) : (
                users.map((user, index) => (
                  <React.Fragment key={user.id}>
                    <div 
                      onClick={() => handleUserClick(user.id)}
                      className="flex items-center p-5 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <img
                        src={user.profile_picture || 'https://via.placeholder.com/150'}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover mr-4"
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800">{user.name}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <div className="text-sm text-gray-500 whitespace-nowrap">
                        Bergabung: {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {index < users.length - 1 && (
                      <div className="border-t border-gray-100 mx-5"></div>
                    )}
                  </React.Fragment>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Users;