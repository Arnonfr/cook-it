import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface ShareToastProps {
  recipeUrl: string;
  recipeTitle?: string;
  isExtracting: boolean;
  onDismiss: () => void;
}

export const ShareToast = ({ recipeUrl: _recipeUrl, recipeTitle, isExtracting, onDismiss }: ShareToastProps) => {
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

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleExpand = () => {
    setIsMinimized(false);
  };

  // Minimized state - compact pill
  if (isMinimized) {
    return (
      <button
        onClick={handleExpand}
        className={`fixed bottom-24 left-4 z-50 flex items-center gap-2 h-[40px] bg-white shadow-md border border-slate-200 rounded-full px-3 transition-all duration-300 hover:shadow-lg ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {isExtracting ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-[#2f6d63] border-t-transparent animate-spin" />
            <span className="text-xs font-medium text-slate-600">מחלץ...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 text-[#2f6d63]" />
            <span className="text-xs font-medium text-slate-600">נוסף לספרייה</span>
          </>
        )}
        <ChevronUp size={14} className="text-slate-400 mr-1" />
      </button>
    );
  }

  // Expanded state - compact toast (40px height)
  return (
    <div 
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="bg-white rounded-[8px] shadow-lg border border-slate-200 overflow-hidden">
        {/* Progress bar */}
        {!isExtracting && (
          <div className="h-[2px] bg-slate-100">
            <div 
              className="h-full bg-[#2f6d63] transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        
        <div className="flex items-center gap-2 px-3 h-[40px]">
          {/* Status icon - small */}
          <div className="shrink-0">
            {isExtracting ? (
              <div className="w-4 h-4 rounded-full border-2 border-[#2f6d63] border-t-transparent animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#2f6d63]" />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">
              {isExtracting ? 'מחלץ מתכון...' : 'נוסף לספרייה'}
            </p>
            {recipeTitle && !isExtracting && (
              <p className="text-[10px] text-slate-500 truncate">{recipeTitle}</p>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Minimize button - shown during extraction */}
            {isExtracting && (
              <button
                onClick={handleMinimize}
                className="flex items-center gap-0.5 px-2 h-[24px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-[4px] transition-colors"
                title="המשך ברקע"
              >
                <ChevronDown size={14} />
                <span className="text-[11px]">מזער</span>
              </button>
            )}
            
            {/* Close button - shown when done */}
            {!isExtracting && (
              <button
                onClick={handleDismiss}
                className="flex items-center justify-center w-6 h-6 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                title="סגור"
              >
                <span className="text-[14px] leading-none">×</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
