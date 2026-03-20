import { useEffect, useState } from 'react';
import { ExternalLink, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface ShareToastProps {
  recipeUrl: string;
  recipeTitle?: string;
  isExtracting: boolean;
  onOpen: () => void;
  onDismiss: () => void;
}

export const ShareToast = ({ recipeUrl: _recipeUrl, recipeTitle, isExtracting, onOpen, onDismiss }: ShareToastProps) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isExtracting) {
      // Auto-dismiss after 4 seconds with progress bar
      const duration = 4000;
      const interval = 50;
      const steps = duration / interval;
      let currentStep = 0;

      const progressInterval = setInterval(() => {
        currentStep++;
        setProgress((currentStep / steps) * 100);
        
        if (currentStep >= steps) {
          clearInterval(progressInterval);
          handleDismiss();
        }
      }, interval);

      return () => clearInterval(progressInterval);
    }
  }, [isExtracting]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  const handleOpen = () => {
    onOpen();
    handleDismiss();
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleExpand = () => {
    setIsMinimized(false);
  };

  // Minimized state - small floating indicator
  if (isMinimized) {
    return (
      <button
        onClick={handleExpand}
        className={`fixed bottom-24 left-4 z-50 flex items-center gap-2 bg-white shadow-lg border border-slate-200 rounded-full px-3 py-2 transition-all duration-300 hover:shadow-xl ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {isExtracting ? (
          <>
            <div className="w-5 h-5 rounded-full border-2 border-[#2f6d63] border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-slate-700">מחלץ...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 text-[#2f6d63]" />
            <span className="text-xs font-bold text-slate-700">המתכון מוכן</span>
          </>
        )}
        <ChevronUp size={14} className="text-slate-400 mr-1" />
      </button>
    );
  }

  // Expanded state - full toast
  return (
    <div 
      className={`fixed bottom-[33vh] left-1/2 -translate-x-1/2 z-50 w-[66vw] max-w-[400px] transition-all duration-300 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="bg-white rounded-[12px] shadow-2xl border border-slate-200 overflow-hidden">
        {/* Progress bar */}
        {!isExtracting && (
          <div className="h-1 bg-slate-100">
            <div 
              className="h-full bg-[#2f6d63] transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Status icon */}
          <div className="shrink-0">
            {isExtracting ? (
              <div className="w-8 h-8 rounded-full border-2 border-[#2f6d63] border-t-transparent animate-spin" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-[#2f6d63]" />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {isExtracting ? 'מחלץ מתכון...' : 'המתכון נוסף לספרייה'}
            </p>
            {recipeTitle && !isExtracting && (
              <p className="text-xs text-slate-500 truncate">{recipeTitle}</p>
            )}
            {isExtracting && (
              <p className="text-xs text-slate-400">החילוץ ממשיך ברקע</p>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Minimize button - shown during extraction */}
            {isExtracting && (
              <button
                onClick={handleMinimize}
                className="flex items-center gap-1 px-2 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-[6px] transition-colors"
                title="המשך ברקע"
              >
                <ChevronDown size={16} />
                <span className="text-xs font-bold">המשך</span>
              </button>
            )}
            
            {/* Open button - shown when done */}
            {!isExtracting && (
              <button
                onClick={handleOpen}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#2f6d63] text-white text-xs font-bold rounded-[6px] hover:bg-[#285c54] transition-colors"
              >
                <ExternalLink size={12} />
                פתיחה
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
