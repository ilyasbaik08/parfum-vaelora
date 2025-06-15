import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FcGoogle } from 'react-icons/fc';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      // Registrasi user ke Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      // Jika user berhasil dibuat, simpan data ke tabel profiles
      if (data?.user) {
        const { error: insertError } = await supabase.from('profiles').insert([
          {
            id: data.user.id,   // ID dari Supabase Auth
            name,               // Nama yang diinput pengguna
            email,              // Simpan juga email ke profiles
            role: 'user'        // Set default role sebagai 'user'
          },
        ]);

        if (insertError) {
          setErrorMessage(insertError.message);
          return;
        }

        navigate('/home');
      }
    } catch (err) {
      setErrorMessage('Unexpected error occurred. Please try again later.');
      console.error('Register error:', err);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      {/* Kiri: branding */}
      <div className="hidden lg:flex w-1/2 bg-pinkmuda items-center justify-center">
        <div className="text-center px-8">
          <h1 className="text-white text-4xl font-medium font-cinzel">VAELORA PARFUM</h1>
        </div>
      </div>

      {/* Kanan: form register */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 px-8 py-12">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-3xl font-medium text-gray-900 text-center">Register</h2>
        </div>

        <div className="mt-8 max-w-md w-full mx-auto">
          <div className="bg-white py-10 px-8 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300">
            <form onSubmit={handleRegister} className="space-y-6">
              {/* Input Nama */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-pinkmuda focus:border-pinkmuda"
                />
              </div>

              {/* Input Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-pinkmuda focus:border-pinkmuda"
                />
              </div>

              {/* Input Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 w-full px-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-pinkmuda focus:border-pinkmuda"
                />
              </div>

              {/* Tombol Submit */}
              <button
                type="submit"
                className="w-full py-2 px-4 bg-pink text-white  rounded-lg shadow bg-pinkmuda transition"
              >
                Register
              </button>

              {/* Garis pemisah */}
              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="mx-4 text-gray-400">atau</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              {/* Tombol Google (dummy) */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
              >
                <FcGoogle className="w-5 h-5" />
                Daftar dengan Google
              </button>
            </form>

            {/* Tampilkan error jika ada */}
            {errorMessage && (
              <p className="text-red-500 text-sm mt-4 text-center">{errorMessage}</p>
            )}

            {/* Link ke login */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Sudah punya akun?{' '}
                <Link to="/" className="font-medium text-pinkmuda">
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;