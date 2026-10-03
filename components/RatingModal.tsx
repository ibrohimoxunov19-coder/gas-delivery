'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from './Toast';
import { Star, Send, X } from 'lucide-react';

interface Props {
  orderId: number;
  onClose: () => void;
}

export default function RatingModal({ orderId, onClose }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { toast('Kamida 1 yulduz bering', 'error'); return; }
    setLoading(true);
    const { error } = await supabase.from('orders').update({
      rating,
      review_text: review.trim(),
    }).eq('id', orderId);

    if (!error) {
      toast('Bahoyingiz uchun rahmat! ⭐', 'success');
      onClose();
    } else {
      toast('Xatolik: ' + error.message, 'error');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-center mb-2">Haydovchini baholang</h3>
        <p className="text-sm text-gray-500 text-center mb-6">Xizmatingiz qanday o'tdi?</p>

        {/* Yulduzlar */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-10 h-10 ${
                  star <= (hovered || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Izoh */}
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Fikringizni yozing (ixtiyoriy)..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-4"
        />

        <button
          onClick={handleSubmit}
          disabled={loading || rating === 0}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold hover:from-blue-700 transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" /> {loading ? 'Yuborilmoqda...' : 'Yuborish'}
        </button>
      </div>
    </div>
  );
}