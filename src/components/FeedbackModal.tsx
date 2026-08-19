import React, { useState } from 'react';
import { MessageSquarePlus, X, Star, CheckCircle2, Sparkles } from 'lucide-react';

export const FeedbackWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(5);
  const [category, setCategory] = useState<string>('I like it');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const categories = [
    'The product is unclear',
    'Something is confusing',
    'I like it',
    'I would use this',
    'Feature suggestion',
    'Other'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Store feedback locally in localStorage for testing
    const existingFeedback = JSON.parse(localStorage.getItem('xia_chat_feedback') || '[]');
    const newEntry = {
      rating,
      category,
      comment,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('xia_chat_feedback', JSON.stringify([...existingFeedback, newEntry]));

    setSubmitted(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setSubmitted(false);
      setComment('');
    }, 300);
  };

  return (
    <>
      {/* Floating Bottom-Right Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-[#171717] hover:bg-[#FF8A2A] text-white px-4 py-2.5 rounded-full shadow-lg border border-white/20 flex items-center gap-2 text-xs font-black transition-all duration-300 active:scale-95 group"
        aria-label="Give Feedback"
      >
        <MessageSquarePlus className="w-4 h-4 text-[#FF8A2A] group-hover:text-white transition-colors" />
        <span>Give Feedback</span>
      </button>

      {/* Feedback Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171717]/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white border border-[#E8E8E5] rounded-[32px] max-w-[480px] w-full p-6 sm:p-8 subtle-card-shadow relative overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-[#171717] hover:bg-[#F7F7F5] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!submitted ? (
              <div>
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF0E5] text-[#D96512] text-xs font-black mb-3 border border-[#FF8A2A]/30">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF8A2A]" />
                    <span>Usability Feedback</span>
                  </div>
                  <h3 className="text-2xl font-black text-[#171717] tracking-tight">
                    Help us improve Xia Chat
                  </h3>
                  <p className="text-xs text-[#6B6B6B] mt-1.5 leading-relaxed font-medium">
                    Your feedback helps us make the Xia Chat experience clearer and better for online businesses.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Rating 1 to 5 */}
                  <div>
                    <label className="block text-xs font-extrabold text-[#171717] uppercase tracking-wider mb-2">
                      How clear is Xia Chat to you?
                    </label>
                    <div className="flex items-center gap-2 justify-between bg-[#F7F7F5] p-3 rounded-2xl border border-[#E8E8E5]">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                            rating === star
                              ? 'bg-[#FF8A2A] text-white shadow-xs'
                              : 'bg-white text-[#6B6B6B] hover:text-[#171717] border border-[#E8E8E5]'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${rating === star ? 'fill-white' : 'fill-gray-300'}`} />
                          <span>{star}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category Pills */}
                  <div>
                    <label className="block text-xs font-extrabold text-[#171717] uppercase tracking-wider mb-2">
                      Category
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            category === cat
                              ? 'bg-[#171717] text-white shadow-xs'
                              : 'bg-[#F7F7F5] text-[#6B6B6B] hover:text-[#171717] border border-[#E8E8E5]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <label className="block text-xs font-extrabold text-[#171717] uppercase tracking-wider mb-1.5">
                      Tell us what you think...
                    </label>
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="What was clear? What could be improved?"
                      className="w-full px-4 py-3 bg-[#F7F7F5] border border-[#E8E8E5] rounded-xl text-xs focus:outline-none focus:border-[#FF8A2A] font-medium resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white text-sm font-black shadow-md transition-all duration-200"
                  >
                    Submit Feedback
                  </button>
                </form>
              </div>
            ) : (
              <div className="py-6 text-center space-y-4 animate-in fade-in duration-200">
                <div className="w-14 h-14 rounded-full bg-[#FFF0E5] text-[#FF8A2A] mx-auto flex items-center justify-center border border-[#FF8A2A]/40">
                  <CheckCircle2 className="w-7 h-7 text-[#FF8A2A]" />
                </div>

                <h3 className="text-2xl font-black text-[#171717]">Thank you!</h3>
                <p className="text-xs text-[#6B6B6B] leading-relaxed max-w-[340px] mx-auto font-medium">
                  Your feedback has been saved. Thank you for helping us refine Xia Chat.
                </p>

                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-full bg-[#171717] text-white text-xs font-bold shadow-xs hover:bg-gray-800 transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
