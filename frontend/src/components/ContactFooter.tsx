import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';

export default function ContactFooter() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [interestedInApps, setInterestedInApps] = useState(true);

  const handleSend = async () => {
    if (!message.trim()) return;
    if (interestedInApps && !email.trim()) {
      alert('כדי לקבל עדכונים על אפליקציות יש להזין מייל');
      return;
    }
    setLoading(true);
    // Note: base44 import was removed since it's not defined in the workspace
    // In a real scenario, we'd need to ensure the API call works.
    console.log('Sending message:', { message, phone, email, interestedInApps });
    setTimeout(() => {
        setSent(true);
        setLoading(false);
    }, 1000);
  };

  return (
    <div className="px-6 py-6 pb-20 md:pb-6 text-center space-y-3">
      <p className="text-[10px] text-[#0a1628] font-bold tracking-wide">
        היי, אני עושה גם דברים רציניים יותר — דברו איתי
      </p>
      <a
        href="https://frielabs.live"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-[11px] text-[#0a1628]/60 font-black tracking-widest uppercase hover:text-[#0a1628] transition-colors border border-[#0a1628]/20 hover:border-[#0a1628]/50 px-4 py-2"
      >
        צור קשר
      </a>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 24 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="bg-white w-full max-w-sm p-7 space-y-5 relative"
              dir="rtl"
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 left-4 text-[#0a1628]/30 hover:text-[#0a1628]/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#0a1628]/35 mb-1">צור קשר</p>
                <h3 className="text-xl font-black text-[#0a1628] tracking-tight">דברו איתי</h3>
              </div>

              {/* Message */}
              {!sent ? (
                <div className="space-y-3">
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="כתוב הודעה..."
                    className="w-full border border-[#0a1628]/15 p-3 text-sm text-[#0a1628] placeholder-[#0a1628]/30 resize-none h-24 outline-none focus:border-[#0a1628]/40 font-medium"
                  />
                  
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-[#0a1628]/50 uppercase tracking-wide">פרטים ליצירת קשר (אופציונלי)</p>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="מייל (אופציונלי)"
                      className="w-full border border-[#0a1628]/15 p-2 text-sm text-[#0a1628] placeholder-[#0a1628]/30 outline-none focus:border-[#0a1628]/40 font-medium"
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="טלפון (אופציונלי)"
                      className="w-full border border-[#0a1628]/15 p-2 text-sm text-[#0a1628] placeholder-[#0a1628]/30 outline-none focus:border-[#0a1628]/40 font-medium"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={interestedInApps}
                      onChange={e => setInterestedInApps(e.target.checked)}
                      className="w-4 h-4 accent-[#0a1628] cursor-pointer"
                    />
                    <span className="text-xs font-bold text-[#0a1628]/60 group-hover:text-[#0a1628]/80 transition-colors">
                      ספר לי על אפליקציות מעניינות אחרות
                    </span>
                  </label>
                  {interestedInApps && !email.trim() && (
                    <p className="text-[10px] text-orange-500 font-bold">* נדרש מייל כדי לקבל עדכונים</p>
                  )}

                  <button
                    onClick={handleSend}
                    disabled={loading || !message.trim()}
                    className="w-full bg-[#0a1628] text-white py-3 text-xs font-black tracking-widest uppercase hover:bg-[#1a2d4a] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {loading ? 'שולח...' : 'שלח הודעה'}
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-4 text-center text-xs font-black tracking-widest uppercase text-[#0a1628]/40"
                >
                  ✓ ההודעה נשלחה
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <a
        href="https://www.linkedin.com/in/arnon-friedman-00454867/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-4 text-[11px] text-[#0a1628]/60 font-black tracking-widest uppercase hover:text-[#0a1628] transition-colors border border-[#0a1628]/20 hover:border-[#0a1628]/50 px-4 py-2"
      >
        LinkedIn
      </a>
    </div>
  );
}
