-- 2. Policy for INSERT (Upload new images)
CREATE POLICY "Allow upload to profile pictures folder" 
ON storage.objects 
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = 'profile-pictures' AND
  (storage.foldername(name))[2] LIKE (auth.uid()::text || '.%')
);

-- 3. Policy for UPDATE (Modify existing images)
CREATE POLICY "Allow update in profile pictures folder" 
ON storage.objects 
FOR UPDATE TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = 'profile-pictures' AND
  (storage.foldername(name))[2] LIKE (auth.uid()::text || '.%')
)
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = 'profile-pictures' AND
  (storage.foldername(name))[2] LIKE (auth.uid()::text || '.%')
);

-- 4. Policy for SELECT (Read images)
CREATE POLICY "Allow public read from profile pictures" 
ON storage.objects 
FOR SELECT USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = 'profile-pictures'
);

-- INSERT: Hanya user terautentikasi bisa upload ke folder product-images
CREATE POLICY "Allow upload to product images folder"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = 'product-images'
);

-- UPDATE: Hanya user terautentikasi bisa update file di folder product-images
CREATE POLICY "Allow update in product images folder"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = 'product-images'
)
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = 'product-images'
);

-- SELECT: Siapa saja boleh melihat gambar produk
CREATE POLICY "Allow public read from product images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = 'product-images'
);