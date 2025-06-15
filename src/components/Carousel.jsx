import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    id: 1,
    title: "Belanja Hemat, Barang Berkualitas!",
    description: "Diskon hingga 50% hanya minggu ini!",
  },
  {
    id: 2,
    title: "Temukan Parfum Favoritmu",
    description: "Ribuan pilihan parfum tersedia untukmu!",
  },
  {
    id: 3,
    title: "Pengiriman cepat & aman",
    description: "Belanja dari rumah tanpa khawatir",
  },
];

const Carousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? slides.length - 1 : prevIndex - 1
    );
  };

  const nextSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === slides.length - 1 ? 0 : prevIndex + 1
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();  
    }, 5000); 

    return () => clearInterval(interval);  
  }, []);

  return (
    <div className="container mx-auto px-4 mt-6">
      <div className="relative w-full h-64 bg-pinkmuda overflow-hidden rounded-lg shadow-md">
        <div className="flex items-center justify-center h-full text-center text-white px-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">{slides[currentIndex].title}</h2>
            <p className="text-lg">{slides[currentIndex].description}</p>
          </div>
        </div>

        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-30 hover:bg-opacity-50 p-2 rounded-full text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-30 hover:bg-opacity-50 p-2 rounded-full text-white"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default Carousel;
