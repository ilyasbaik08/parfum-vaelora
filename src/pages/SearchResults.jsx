import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import { ShoppingCart } from 'lucide-react';
import { FaStar, FaRegStar } from 'react-icons/fa';

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const SearchResults = () => {
  const query = useQuery();
  const keyword = query.get('keyword') || '';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!keyword.trim()) {
      setProducts([]);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('product_name', `%${keyword}%`)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
        setProducts([]);
      } else {
        setProducts(data);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [keyword]);

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

  const handleBuyNow = () => {
    alert('Fitur beli sekarang belum diimplementasikan.');
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">
          Hasil Pencarian: <span className="text-green-600">"{keyword}"</span>
        </h1>

        {loading && <p>Memuat produk...</p>}
        {error && <p className="text-red-600">Error: {error}</p>}

        {!loading && products.length === 0 && (
          <p>Tidak ada produk yang cocok dengan pencarian.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const discount = 10;
            const discountPrice = (product.price * (1 - discount / 100)).toFixed(2);
            const rating = product.rating || 4;

            return (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
              >
                <div
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="cursor-pointer"
                >
                  <div className="h-48 overflow-hidden">
                    <img
                      src={product.product_image || '/default-product.png'}
                      alt={product.product_name}
                      className="w-full h-full object-contain p-4"
                    />
                  </div>
                  <div className="p-4">
                    <h2 className="text-lg font-semibold mb-2 line-clamp-1">{product.product_name}</h2>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                  </div>
                </div>

                <div className="px-4 pb-4 mt-auto">
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
                    <button
                      onClick={handleBuyNow}
                      className="flex-1 bg-pinkmuda text-white py-2 px-4 rounded-lg transition"
                    >
                      Beli Sekarang
                    </button>
                    <button
                      onClick={() => handleAddToCart(product.id)}
                      className="p-2 border border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition"
                      aria-label="Tambah ke keranjang"
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

export default SearchResults;