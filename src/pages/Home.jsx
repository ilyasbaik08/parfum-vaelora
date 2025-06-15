import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, MoreVertical, Trash2 } from 'lucide-react';
import { FaStar, FaRegStar } from 'react-icons/fa';
import Carousel from '../components/Carousel';
import Navbar from '../components/Navbar';
import { supabase } from '../supabaseClient';
import { useUser } from '../UserContext';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(null);
  const { userName, setUserName, userRole, setUserRole } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        navigate('/');
        return;
      }

      try {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (userError) throw userError;
        
        if (userData) {
          setUserName(userData.name);
          setUserRole(userData.role);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    checkAuth();
  }, [navigate, setUserName, setUserRole]);

  const fetchProducts = async () => {
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id, 
          user_id,
          product_name, 
          description, 
          price,
          created_at,
          product_images (id, product_image)
        `)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;
      
      setProducts(productsData || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddToCart = async (productId) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/login');
      return;
    }

    try {
      const { data: existingCart, error: cartError } = await supabase
        .from('carts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (cartError) throw cartError;

      if (existingCart) {
        const { error: updateError } = await supabase
          .from('carts')
          .update({ 
            quantity: existingCart.quantity + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCart.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('carts')
          .insert({
            product_id: productId,
            user_id: session.user.id,
            quantity: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }

      alert('Produk berhasil ditambahkan ke keranjang');
    } catch (err) {
      console.error('Error:', err);
      alert('Gagal menambahkan ke keranjang: ' + err.message);
    }
  };

  const handleViewProduct = async (product) => {
    const { data: { session } } = await supabase.auth.getSession();
    const viewerId = session?.user?.id;

    if (!viewerId) {
      navigate('/login');
      return;
    }

    try {
      const { data: owner, error: ownerError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', product.user_id)
        .maybeSingle();

      if (ownerError) throw ownerError;

      if (owner && owner.id !== viewerId) {
        const { data: viewer, error: viewerError } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', viewerId)
          .maybeSingle();

        if (viewerError) throw viewerError;

        await supabase
          .from('notifications')
          .insert({
            user_id: owner.id,
            product_id: product.id,
            notif: `${viewer.name} melihat produk Anda.`,
          });
      }
    } catch (err) {
      console.error('Gagal mengirim notifikasi:', err);
    }

    navigate(`/product/${product.id}`);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      // First delete product images
      const { error: deleteImagesError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);

      if (deleteImagesError) throw deleteImagesError;

      // Then delete the product
      const { error: deleteProductError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (deleteProductError) throw deleteProductError;

      // Refresh the product list
      fetchProducts();
      setShowMenu(null);
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Failed to delete product: ' + err.message);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="text-center mt-10 text-xl">Memuat produk...</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="text-center mt-10 text-xl text-red-500">Error: {error}</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="mt-20">
        <Carousel />
      </div>
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-center mb-8">Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => {
            const discount = 10;
            const discountPrice = (product.price * (1 - discount / 100)).toFixed(2);
            const rating = product.rating || 4;
            const mainImage = product.product_images && product.product_images.length > 0 
              ? product.product_images[0].product_image 
              : 'https://via.placeholder.com/300';

            return (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow relative"
              >
                {userRole === 'admin' && (
                  <div className="absolute top-2 right-2 z-10">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(showMenu === product.id ? null : product.id);
                      }}
                      className="p-1 rounded-full bg-white bg-opacity-70 hover:bg-gray-100"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-600" />
                    </button>
                    
                    {showMenu === product.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg py-1 z-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(product.id);
                          }}
                          className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div
                  onClick={() => handleViewProduct(product)}
                  className="cursor-pointer"
                >
                  <div className="h-48 overflow-hidden">
                    <img
                      src={mainImage}
                      alt={product.product_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h2 className="text-lg font-semibold mb-2 line-clamp-1">{product.product_name}</h2>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <div className="flex items-center mb-2">
                    {Array.from({ length: 5 }, (_, index) => (
                      <span key={index}>
                        {rating > index ? (
                          <FaStar className="text-yellow-500 w-4 h-4" />
                        ) : (
                          <FaRegStar className="text-yellow-500 w-4 h-4" />
                        )}
                      </span>
                    ))}
                    <span className="text-gray-500 text-xs ml-2">{product.stock || 100} stok</span>
                  </div>

                  <div className="text-sm text-gray-500 mb-1">
                    {(product.sold || 200)} terjual
                  </div>

                  <div className="flex flex-col mb-2 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600 font-bold text-lg">Rp{discountPrice}</span>
                      <span className="text-sm text-gray-400 line-through">Rp{product.price}</span>
                      <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                        {discount}% OFF
                      </span>
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-800 w-fit px-2 py-0.5 rounded">
                      COD Tersedia
                    </span>
                  </div>

                  <div className="flex mt-4 gap-2">
                    <button className="flex-1 bg-pinkmuda text-white py-2 px-4 rounded-lg transition">
                      Beli Sekarang
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product.id);
                      }}
                      className="p-2 border border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition"
                    >
                      <ShoppingCart className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Home;