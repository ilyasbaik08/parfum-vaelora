import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import { useUser } from '../UserContext';

const Carts = () => {
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCart = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        navigate('/login');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('carts')
          .select(`
            id,
            quantity,
            products (
              id,
              product_name,
              price,
              description,
              product_images (product_image)
            )
          `)
          .eq('user_id', session.user.id);

        if (error) throw error;

        // Format data untuk mengambil gambar pertama dari product_images
        const formattedData = data.map(item => ({
          ...item,
          products: {
            ...item.products,
            product_image: item.products.product_images && item.products.product_images.length > 0 
              ? item.products.product_images[0].product_image 
              : 'https://via.placeholder.com/300'
          }
        }));

        setCartItems(formattedData || []);
        setSelectedItems([]);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchCart();
  }, [navigate]);

  const handleRemoveFromCart = async (cartId) => {
    try {
      const { error } = await supabase.from('carts').delete().eq('id', cartId);
      if (error) throw error;

      setCartItems(prev => prev.filter(item => item.id !== cartId));
      setSelectedItems(prev => prev.filter(id => id !== cartId));
    } catch (err) {
      alert('Gagal menghapus item: ' + err.message);
    }
  };

  const updateQuantity = async (cartId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      const { error } = await supabase
        .from('carts')
        .update({ quantity: newQuantity })
        .eq('id', cartId);

      if (error) throw error;

      setCartItems(prev =>
        prev.map(item =>
          item.id === cartId ? { ...item, quantity: newQuantity } : item
        )
      );
    } catch (err) {
      alert('Gagal memperbarui jumlah: ' + err.message);
    }
  };

  const handleSelectItem = (cartId) => {
    setSelectedItems((prev) =>
      prev.includes(cartId)
        ? prev.filter(id => id !== cartId)
        : [...prev, cartId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
      setSelectAll(false);
    } else {
      const allIds = cartItems.map(item => item.id);
      setSelectedItems(allIds);
      setSelectAll(true);
    }
  };

  const handleCheckout = () => {
    const itemsToCheckout = cartItems.filter(item => selectedItems.includes(item.id));
    alert('Checkout item:\n' + itemsToCheckout.map(item => item.products.product_name).join('\n'));
    // Lanjutkan proses checkout sesuai kebutuhan
  };

  const getTotalSelectedPrice = () => {
    return cartItems
      .filter(item => selectedItems.includes(item.id))
      .reduce((total, item) => {
        const discount = 10;
        const discountPrice = item.products.price * (1 - discount / 100);
        return total + discountPrice * item.quantity;
      }, 0)
      .toFixed(2);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="text-center mt-10 text-xl">Memuat keranjang...</div>
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
      <div className="container mx-auto px-4 py-8 mt-20 max-w-4xl">
        <h1 className="text-2xl font-bold text-center mb-8">Keranjang Belanja</h1>
        {cartItems.length === 0 ? (
          <p className="text-center text-gray-600">Keranjang kamu masih kosong.</p>
        ) : (
          <>
            <div className="flex items-center mb-4 gap-2">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="w-5 h-5"
              />
              <label className="text-gray-700">Pilih Semua</label>
            </div>

            <div className="space-y-4 pb-24">
              {cartItems.map(item => {
                const product = item.products;
                const discount = 10;
                const discountPrice = (product.price * (1 - discount / 100)).toFixed(2);

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white rounded-lg shadow p-4"
                  >
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        className="w-5 h-5"
                      />
                      <img
                        src={product.product_image}
                        alt={product.product_name}
                        className="w-16 h-16 sm:w-24 sm:h-24 object-contain rounded"
                      />
                    </div>
                    
                    <div className="flex-1 w-full">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-lg font-semibold line-clamp-1">{product.product_name}</h2>
                          <p className="text-gray-600 text-sm line-clamp-2">{product.description}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="p-1 sm:p-2 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition ml-2"
                          title="Hapus dari keranjang"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600 font-bold text-base sm:text-lg">Rp{discountPrice}</span>
                          <span className="text-xs sm:text-sm text-gray-400 line-through">Rp{product.price}</span>
                          <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                            {discount}% OFF
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="px-2 py-1 bg-gray-200 rounded text-sm sm:text-base"
                          >
                            −
                          </button>
                          <span className="text-sm sm:text-base">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="px-2 py-1 bg-gray-200 rounded text-sm sm:text-base"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Tombol Checkout Fixed */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-8">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
              className="w-4 h-4 sm:w-5 sm:h-5"
            />
            <span className="text-sm sm:text-base font-semibold">
              Total: <span className="text-green-600">Rp{getTotalSelectedPrice()}</span>
            </span>
          </div>
          <button
            onClick={handleCheckout}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg text-sm sm:text-base font-semibold disabled:opacity-50"
            disabled={selectedItems.length === 0}
          >
            Checkout ({selectedItems.length})
          </button>
        </div>
      )}
    </>
  );
};

export default Carts;