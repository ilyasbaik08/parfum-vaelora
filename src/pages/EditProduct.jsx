import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';

const EditProduct = () => {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState({
    product_name: '',
    description: '',
    price: '',
    product_image: ''
  });
  const [imageId, setImageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchProductAndUser = async () => {
      setLoading(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          id,
          product_name,
          description,
          price,
          user_id,
          product_images (
            id,
            product_image
          )
        `)
        .eq('id', productId)
        .single();

      if (productError) {
        setError('Failed to load product.');
        console.error('Fetch product error:', productError);
      } else {
        if (user && productData.user_id !== user.id) {
          setError('You are not authorized to edit this product.');
          navigate('/home');
        } else {
          setProduct({
            product_name: productData.product_name,
            description: productData.description,
            price: productData.price,
            product_image: productData.product_images?.product_image || ''
          });
          setImageId(productData.product_images?.id || null);
        }
      }

      setLoading(false);
    };

    if (productId) {
      fetchProductAndUser();
    }
  }, [productId, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let imageUrl = product.product_image;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${productId}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        alert('Failed to upload image');
        console.error('Upload error:', uploadError);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      imageUrl = publicUrlData.publicUrl;

      // Update or insert into product_images
      if (imageId) {
        await supabase
          .from('product_images')
          .update({ product_image: imageUrl, updated_at: new Date().toISOString() })
          .eq('id', imageId);
      } else {
        const { data, error } = await supabase
          .from('product_images')
          .insert({ product_id: productId, product_image: imageUrl });

        if (!error) {
          setImageId(data[0].id);
        }
      }
    }

    const { error } = await supabase
      .from('products')
      .update({
        product_name: product.product_name,
        description: product.description,
        price: product.price,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);

    if (error) {
      alert('Failed to update product.');
      console.error('Update product error:', error);
    } else {
      alert('Product updated successfully');
      navigate(`/product/${productId}`);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    setIsDeleting(true);

    try {
      // Delete product
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      // Delete product image from storage if exists
      if (product.product_image) {
        const imagePath = product.product_image.split('/').pop();
        await supabase.storage
          .from('product-images')
          .remove([`products/${imagePath}`]);
      }

      alert('Product deleted successfully');
      navigate(`/profile/${currentUserId}`);
    } catch (error) {
      console.error('Delete product error:', error);
      alert('Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="text-center py-10">Loading product...</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="text-center text-red-500 py-10">{error}</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto mt-10 bg-white shadow-md rounded-2xl p-6">
        <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Image
            </label>
            <div className="flex items-center space-x-4">
              <img
                src={
                  imageFile
                    ? URL.createObjectURL(imageFile)
                    : product.product_image || 'https://via.placeholder.com/300'
                }
                alt="Product preview"
                className="w-32 h-32 object-cover rounded-lg"
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-green-50 file:text-green-700
                  hover:file:bg-green-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="product_name" className="block text-sm font-medium text-gray-700 mb-1">
              Product Name
            </label>
            <input
              type="text"
              id="product_name"
              name="product_name"
              value={product.product_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={product.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Price ($)
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={product.price}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete Product'}
            </button>
            
            <div className="space-x-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default EditProduct;
