import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import { ShoppingCart } from 'lucide-react';
import { FaStar, FaRegStar } from 'react-icons/fa';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [productImages, setProductImages] = useState([]);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch product data with images
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            *,
            product_images (id, product_image)
          `)
          .eq('id', id)
          .single();

        if (productError) throw productError;

        setProduct(productData);
        setProductImages(productData.product_images || []);

        // Fetch owner profile data
        if (productData?.user_id) {
          const { data: ownerData, error: ownerError } = await supabase
            .from('profiles')
            .select('id, name, profile_picture')
            .eq('id', productData.user_id)
            .single();

          if (ownerError) throw ownerError;
          setOwner(ownerData);
        }

        // Fetch comments with user profiles
        await fetchComments();
        
        // Fetch current user profile if logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, name, profile_picture')
            .eq('id', session.user.id)
            .single();
            
          if (!profileError) setUserProfile(profileData);
        }
      } catch (err) {
        setError('Produk tidak ditemukan.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const fetchComments = async () => {
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          id,
          comment,
          created_at,
          user_id,
          profiles:user_id (id, name, profile_picture)
        `)
        .eq('product_id', id)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;
      setComments(commentsData || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/login');
      return;
    }
    
    setIsSubmittingComment(true);
    
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            user_id: session.user.id,
            product_id: id,
            comment: newComment.trim()
          }
        ])
        .select();
        
      if (error) throw error;
      
      // Refresh comments after successful submission
      await fetchComments();
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Gagal menambahkan komentar: ' + err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAddToCart = async () => {
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
        .eq('product_id', product.id)
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
            product_id: product.id,
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
    alert('Fitur belum tersedia');
  };

  if (error) return (
    <>
      <Navbar />
      <p className="text-center mt-10 text-red-600">{error}</p>
    </>
  );

  if (!product) return (
    <>
      <Navbar />
      <p className="text-center mt-10">Produk tidak ditemukan</p>
    </>
  );

  const discount = 10;
  const discountPrice = (product.price * (1 - discount / 100)).toFixed(2);
  const rating = product.rating || 4;
  const mainImage = productImages.length > 0 
    ? productImages[0].product_image 
    : '/default-product.png';

  return (
    <>
      <Navbar />
      {loading ? (
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-center mt-10">Memuat produk...</p>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="md:w-1/2">
                {/* Main product image */}
                <div className="flex justify-center items-center mb-4">
                  <img
                    src={mainImage}
                    alt={product.product_name}
                    className="w-full max-w-xs h-64 object-contain rounded"
                  />
                </div>
                
                {/* Product image thumbnails */}
                {productImages.length > 1 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {productImages.map((image) => (
                      <img
                        key={image.id}
                        src={image.product_image}
                        alt={`${product.product_name} - ${image.id}`}
                        className="w-16 h-16 object-cover rounded border cursor-pointer hover:border-green-500"
                        onClick={() => setProductImages([image, ...productImages.filter(img => img.id !== image.id)])}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              <div className="md:w-1/2 flex flex-col">
                <h1 className="text-2xl font-bold mb-3">{product.product_name}</h1>
                <p className="text-gray-600 mb-2 text-sm">{product.description}</p>

                <div className="flex items-center mb-3">
                  {Array.from({ length: 5 }, (_, index) => (
                    <span key={index}>
                      {rating > index ? (
                        <FaStar className="text-yellow-500 w-4 h-4" />
                      ) : (
                        <FaRegStar className="text-yellow-500 w-4 h-4" />
                      )}
                    </span>
                  ))}
                  <span className="text-gray-500 text-xs ml-3">{product.stock || 100} stok</span>
                </div>

                <div className="text-xs text-gray-500 mb-2">{product.sold || 200} terjual</div>

                <div className="flex flex-col mb-4 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600 font-bold text-xl">Rp{discountPrice}</span>
                    <span className="text-gray-400 line-through text-sm">Rp{product.price}</span>
                    <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                      {discount}% OFF
                    </span>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-800 w-fit px-2 py-0.5 rounded">
                    COD Tersedia
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 bg-pinkmuda text-white py-2 rounded-lg transition text-sm"
                  >
                    Beli Sekarang
                  </button>
                  <button
                    onClick={handleAddToCart}
                    className="flex items-center justify-center p-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition"
                    aria-label="Tambah ke keranjang"
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Product owner section */}
            {owner && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <Link
                  to={`/profile/${owner.id}`}
                  className="flex items-center space-x-2 p-2 rounded-lg w-fit hover:bg-gray-50"
                >
                  <img
                    src={owner.profile_picture || '/default-profile.png'}
                    alt={owner.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="font-medium text-sm">{owner.name}</span>
                </Link>
              </div>
            )}

            {/* Comments section */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold mb-4">Komentar ({comments.length})</h2>
              
              {/* Add comment form */}
              <div className="mb-6">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Tulis komentar Anda tentang produk ini..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows="3"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="mt-2 bg-pinkmuda text-white py-2 px-4 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isSubmittingComment ? 'Mengirim...' : 'Kirim Komentar'}
                </button>
              </div>
              
              {/* Comments list */}
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Belum ada komentar</p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Link 
                        to={`/profile/${comment.user_id}`}
                        className="flex-shrink-0 hover:opacity-80 transition"
                      >
                        <img
                          src={comment.profiles?.profile_picture || '/default-profile.png'}
                          alt={comment.profiles?.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      </Link>
                      <div className="flex-1">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <Link 
                            to={`/profile/${comment.user_id}`}
                            className="font-medium text-sm hover:text-green-600"
                          >
                            {comment.profiles?.name || 'Pengguna'}
                          </Link>
                          <p className="text-gray-700 mt-1 text-sm">{comment.comment}</p>
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block">
                          {new Date(comment.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductDetail;