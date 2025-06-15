
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import { v4 as uuidv4 } from 'uuid';
import { EllipsisVerticalIcon } from '@heroicons/react/24/solid';

const Profile = () => {
  const { id: receiverId } = useParams();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    profile_picture: '',
    gender: '',
    role: 'user',
    store_name: ''
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isUpgradingToStore, setIsUpgradingToStore] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      setLoading(true);
      setError('');

      // Get logged in user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name, email, profile_picture, gender, role, store_name')
        .eq('id', receiverId)
        .single();

      if (profileError) {
        setError('Failed to load profile.');
        console.error('Fetch profile error:', profileError);
      } else {
        setProfile(profileData);
      }

      // Get user's products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id, 
          product_name, 
          description, 
          price,
          product_images (id, product_image)
        `)
        .eq('user_id', receiverId);

      if (productsError) {
        console.error('Fetch products error:', productsError);
      } else {
        setProducts(productsData || []);
      }

      setLoading(false);
    };

    if (receiverId) {
      fetchUserAndProfile();
    }
  }, [receiverId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleUpdate = async () => {
    let imageUrl = profile.profile_picture;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${currentUserId}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      // Upload image to new bucket and folder structure
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        alert('Failed to upload image');
        console.error('Upload error:', uploadError);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = await supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      imageUrl = publicUrl;
    }

    // Update profile in database
    const { error } = await supabase
      .from('profiles')
      .update({ ...profile, profile_picture: imageUrl })
      .eq('id', currentUserId);

    if (error) {
      alert('Failed to update profile.');
      console.error('Update profile error:', error);
    } else {
      alert('Profile updated successfully');
      setEditing(false);
      setProfile((prev) => ({ ...prev, profile_picture: imageUrl }));
      setImageFile(null);
    }
  };

  const handleUpgradeToStore = async () => {
    if (!profile.store_name) {
      alert('Store name is required');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        role: 'store',
        store_name: profile.store_name
      })
      .eq('id', currentUserId);

    if (error) {
      alert('Failed to upgrade to store account');
      console.error('Upgrade error:', error);
    } else {
      alert('Successfully upgraded to store account!');
      setProfile(prev => ({ ...prev, role: 'store' }));
      setIsUpgradingToStore(false);
      window.location.reload();
    }
  };

  const handleSendMessage = async () => {
    if (!currentUserId || !receiverId) return;

    // Check if chat already exists
    const { data: existingChats, error: fetchError } = await supabase
      .from('chats')
      .select('chat_id')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`
      )
      .limit(1);

    if (fetchError) {
      console.error('Error fetching existing chats:', fetchError);
      return;
    }

    if (existingChats && existingChats.length > 0) {
      navigate(`/chat/${existingChats[0].chat_id}`);
      return;
    }

    // Create new chat
    const chatId = uuidv4();
    const { error } = await supabase.from('chats').insert({
      chat_id: chatId,
      sender_id: currentUserId,
      receiver_id: receiverId,
      message: '👋',
    });

    if (error) {
      console.error('Error creating chat:', error);
      return;
    }

    navigate(`/chat/${chatId}`);
  };

  const toggleDropdown = (productId) => {
    setActiveDropdown(activeDropdown === productId ? null : productId);
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        // Get all images associated with this product
        const { data: productImages, error: fetchImagesError } = await supabase
          .from('product_images')
          .select('id, product_image')
          .eq('product_id', productId);

        if (fetchImagesError) throw fetchImagesError;

        // Delete each image from storage
        if (productImages && productImages.length > 0) {
          const imagePaths = productImages.map(img => {
            const url = new URL(img.product_image);
            return url.pathname.split('/storage/v1/object/public/images/')[1];
          });

          const { error: deleteStorageError } = await supabase
            .storage
            .from('images')
            .remove(imagePaths);

          if (deleteStorageError) throw deleteStorageError;
        }

        // Delete product images from database
        const { error: deleteImagesError } = await supabase
          .from('product_images')
          .delete()
          .eq('product_id', productId);
        
        if (deleteImagesError) throw deleteImagesError;

        // Delete product
        const { error: deleteProductError } = await supabase
          .from('products')
          .delete()
          .eq('id', productId);
        
        if (deleteProductError) {
          throw deleteProductError;
        } else {
          setProducts(products.filter(product => product.id !== productId));
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product');
      }
    }
    setActiveDropdown(null);
  };

  return (
    <>
      <Navbar />
      {loading ? (
        <div className="text-center py-10">Loading profile...</div>
      ) : error ? (
        <div className="text-center text-red-500 py-10">{error}</div>
      ) : (
        <div className="max-w-4xl mx-auto mt-10 bg-white shadow-md rounded-2xl p-6">
          <div className="flex flex-col items-center text-center">
            <img
              src={
                imageFile
                  ? URL.createObjectURL(imageFile)
                  : profile.profile_picture || 'https://via.placeholder.com/150'
              }
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-green-500"
            />

            {editing && currentUserId === receiverId ? (
              <div className="w-full mt-4 space-y-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full border p-2 rounded-lg"
                />
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  placeholder="Name"
                  className="w-full border p-2 rounded-lg"
                />
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="w-full border p-2 rounded-lg"
                />
                <select
                  name="gender"
                  value={profile.gender}
                  onChange={handleChange}
                  className="w-full border p-2 rounded-lg"
                >
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>

                <div className="flex gap-4 justify-center mt-4">
                  <button
                    onClick={handleUpdate}
                    className="bg-pinkmuda text-white px-4 py-2 rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setImageFile(null);
                    }}
                    className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="mt-4 text-2xl font-bold text-gray-800">
                  {profile.role === 'store' ? profile.store_name : profile.name || 'Unknown'}
                </h2>
                {
                  profile.role === 'store' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      store
                    </span>
                  )
                }
                <p className="text-gray-600">{profile.email}</p>

                {currentUserId === receiverId ? (
                  <div className="flex gap-4 justify-center mt-4">
                    <button
                      onClick={() => setEditing(true)}
                      className="bg-pinkmuda text-white px-4 py-2 rounded-lg"
                    >
                      Edit Profile
                    </button>
                    {profile.role === 'store' && (
                      <button
                        onClick={() => navigate('/add-product')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Add Product
                      </button>
                    )}
                    {profile.role !== 'store' && (
                      <button
                        onClick={() => setIsUpgradingToStore(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Daftar Akun Toko
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleSendMessage}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Kirim Pesan
                  </button>
                )}
              </>
            )}

            {isUpgradingToStore && (
              <div className="max-w-md mx-auto mt-6 p-4 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold mb-2">Upgrade to Store Account</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Dengan mendaftar Akun Toko Anda menyetujui syarat dan ketentuan.
                </p>
                <input
                  type="text"
                  name="store_name"
                  value={profile.store_name}
                  onChange={handleChange}
                  placeholder="Nama Toko Anda"
                  className="w-full border p-2 rounded-lg mb-4"
                  required
                />
                <div className="flex gap-4">
                  <button
                    onClick={handleUpgradeToStore}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Confirm Upgrade
                  </button>
                  <button
                    onClick={() => setIsUpgradingToStore(false)}
                    className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Products Section */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold mb-4">
              Products
            </h3>
            {products.length === 0 ? (
              <p className="text-gray-500">No products yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
                    {currentUserId === receiverId && (
                      <div className="absolute top-2 right-2 z-10">
                        <button 
                          onClick={() => toggleDropdown(product.id)}
                          className="p-1 rounded-full bg-white bg-opacity-80 hover:bg-gray-200"
                        >
                          <EllipsisVerticalIcon className="h-5 w-5 text-gray-600" />
                        </button>
                        
                        {activeDropdown === product.id && (
                          <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg py-1 z-20">
                            <button
                              onClick={() => {
                                navigate(`/edit-product/${product.id}`);
                                setActiveDropdown(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <img
                      src={
                        product.product_images && product.product_images.length > 0 
                          ? product.product_images[0].product_image 
                          : 'https://via.placeholder.com/300'
                      }
                      alt={product.product_name}
                      className="w-full h-48 object-cover cursor-pointer"
                      onClick={() => navigate(`/product/${product.id}`)}
                    />
                    <div className="p-4">
                      <h4 className="font-medium text-lg">{product.product_name}</h4>
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">{product.description}</p>
                      <p className="text-green-600 font-semibold mt-2">${product.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Profile;
