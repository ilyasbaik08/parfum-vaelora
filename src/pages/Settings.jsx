import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';

const Settings = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('Password baru dan konfirmasi tidak cocok.');
      return;
    }

    setLoading(true);

    try {
      // Re-authenticate using old password
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const userEmail = sessionData?.session?.user?.email;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: oldPassword,
      });

      if (signInError) {
        setMessage('Password lama salah.');
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setMessage('Gagal memperbarui password.');
      } else {
        setMessage('Password berhasil diperbarui.');
      }
    } catch (err) {
      setMessage('Terjadi kesalahan saat memperbarui password.');
    }

    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <div className="max-w-md mx-auto mt-24 p-6 bg-white rounded-xl shadow-md">
        <h2 className="text-xl font-bold mb-4 text-center">Ubah Password</h2>
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Password Lama</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:ring-green-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Password Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:ring-green-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:ring-green-500 focus:outline-none"
              required
            />
          </div>
          {message && <p className="text-sm text-center text-red-600">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition"
          >
            {loading ? 'Memproses...' : 'Perbarui Password'}
          </button>
        </form>
      </div>
    </>
  );
};

export default Settings;
