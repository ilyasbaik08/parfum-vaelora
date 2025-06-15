import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useUser } from './UserContext'; 
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AddProduct from './pages/AddProduct';
import Carts from './pages/Carts';
import SearchResults from './pages/SearchResults';
import Inbox from './pages/Inbox';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import ProductDetail from './pages/ProductDetail';
import Users from './pages/Users';
import EditProduct from './pages/EditProduct';

const App = () => {
  const { setUserName } = useUser();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();

        if (profile && !error) {
          setUserName(profile.name);
        }
      }
    };

    fetchUserProfile();
  }, [setUserName]);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/add-product" element={<AddProduct />} />
          <Route path="/home" element={<Home />} />
          <Route path="/carts" element={<Carts />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/chat/:chat_id" element={<Chat />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/users" element={<Users />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/edit-product/:id" element={<EditProduct />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

export default App;
