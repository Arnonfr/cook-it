import { useState, useCallback, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export const PullToRefresh = ({ onRefresh, children, className = '' }: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      const progress = Math.min(diff / 100, 1);
      setPullProgress(progress);
      
      if (progress >= 1) {
        isPulling.current = false;
        setIsRefreshing(true);
        setPullProgress(0);
        
        onRefresh().finally(() => {
          setIsRefreshing(false);
        });
      }
    }
  }, [isRefreshing, onRefresh]);

  const handleTouchEnd = useCallback(() => {
    isPulling.current = false;
    if (!isRefreshing) {
      setPullProgress(0);
    }
  }, [isRefreshing]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div ref={containerRef} className={`relative overflow-y-auto ${className}`}>
      {/* Pull indicator */}
      {(pullProgress > 0 || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center transition-all"
          style={{ 
            height: `${Math.max(pullProgress * 60, isRefreshing ? 60 : 0)}px`,
            opacity: Math.max(pullProgress, isRefreshing ? 1 : 0)
          }}
        >
          <div className="flex items-center gap-2 text-slate-500">
            <RefreshCw 
              size={20} 
              className={isRefreshing ? 'animate-spin' : ''} 
              style={{ transform: `rotate(${pullProgress * 360}deg)` }}
            />
            <span className="text-sm">
              {isRefreshing ? 'מעדכן...' : pullProgress >= 1 ? 'שחרר לעדכון' : 'משוך לעדכון'}
            </span>
          </div>
        </div>
      )}
      
      {children}
    </div>
  );
};
