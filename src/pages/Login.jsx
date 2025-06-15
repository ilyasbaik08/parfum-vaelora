// Import React dan useState untuk menyimpan state (email, password, error).
import React, { useState } from 'react';
// Import useNavigate untuk redirect halaman, dan Link untuk navigasi antar halaman.
import { useNavigate, Link } from 'react-router-dom';
// Import icon Google dari react-icons.
import { FcGoogle } from 'react-icons/fc';
// Import instance supabase dari konfigurasi client.
import { supabase } from '../supabaseClient';

function Login() {
  // State untuk menyimpan input email, password, dan pesan error.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Untuk navigasi ke halaman lain setelah login berhasil.
  const navigate = useNavigate();

  // Fungsi yang dipanggil saat form login disubmit.
  const handleLogin = async (e) => {
    e.preventDefault(); // Mencegah reload halaman.
    setErrorMessage(''); // Reset pesan error sebelum mencoba login.

    try {
      // Proses login menggunakan Supabase Auth dengan email & password.
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Jika error dari Supabase, tampilkan pesan ke pengguna.
      if (error) {
        setErrorMessage(error.message);
        return;
      }

      // Jika login sukses dan data user tersedia, arahkan ke halaman /home.
      if (data?.user) {
        navigate('/home');
      }
    } catch (err) {
      // Jika terjadi error tak terduga, tampilkan pesan umum.
      setErrorMessage('Unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      {/* Bagian kiri hanya terlihat di layar besar, berisi logo & info. */}
      <div className="hidden lg:flex w-1/2 bg-pinkmuda items-center justify-center">
        <div className="text-center px-8">
          <h1 className="text-white text-4xl font-medium font-cinzel">VAELORA PARFUM</h1>
        </div>
      </div>

      {/* Bagian form login */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 px-8 py-12">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-3xl font-medium text-gray-900 text-center">Login</h2>
        </div>

        <div className="mt-8 max-w-md w-full mx-auto">
          <div className="bg-white py-10 px-8 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300">
            {/* Form login */}
            <form className="space-y-6" onSubmit={handleLogin}>
              {/* Input email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-pinkmuda focus:border-pinkmuda transition"
                  />
                </div>
              </div>

              {/* Input password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-pinkmuda focus:border-pinkmuda  transition"
                  />
                </div>
                {/* Link ke halaman lupa password */}
                <div className="text-right mt-2">
                  <Link to="/forgot-password" className="text-sm text-pinkmuda">
                    Lupa password?
                  </Link>
                </div>
              </div>

              {/* Tombol login */}
              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm  text-white bg-pinkmuda focus:outline-none focus:ring-2 focus:ring-offset-2  transition"
                >
                  Login
                </button>
              </div>

              {/* Pesan error jika ada */}
              {errorMessage && (
                <p className="text-red-500 text-sm text-center">{errorMessage}</p>
              )}

              {/* Divider dengan tulisan "atau" */}
              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="mx-4 text-gray-400">atau</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              {/* Tombol login dengan Google (belum aktif, hanya UI) */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
              >
                <FcGoogle className="w-5 h-5" />
                Login dengan Google
              </button>
            </form>

            {/* Link ke halaman register */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Belum punya akun?{' '}
                <Link to="/register" className="font-medium text-pinkmuda">
                  Daftar
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
