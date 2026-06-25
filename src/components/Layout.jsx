import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import HeaderBar from '@/components/HeaderBar';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const layoutRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const element = layoutRef.current;
    if (!element) return;

    const handleTouchStart = (e) => {
      touchStartX.current = e.changedTouches[0].screenX;
      touchStartY.current = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e) => {
      touchEndX.current = e.changedTouches[0].screenX;
      handleSwipe(e);
    };

    const handleSwipe = (e) => {
      const screenWidth = window.innerWidth;
      const firstThird = screenWidth / 3;
      const deltaX = touchEndX.current - touchStartX.current;
      const deltaY = Math.abs(e.changedTouches[0].screenY - touchStartY.current);
      const SWIPE_THRESHOLD = 50;
      const SWIPE_VERTICAL_THRESHOLD = 100;

      // Only respond to horizontal swipes
      if (deltaY > SWIPE_VERTICAL_THRESHOLD) return;

      if (deltaX > SWIPE_THRESHOLD && !sidebarOpen && touchStartX.current <= firstThird) {
        // Prevent browser back navigation
        if (e.cancelable) e.preventDefault();
        setSidebarOpen(true);
      }
      if (deltaX < -SWIPE_THRESHOLD && sidebarOpen) {
        // Prevent browser forward navigation
        if (e.cancelable) e.preventDefault();
        setSidebarOpen(false);
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [sidebarOpen]);

  return (
    <div ref={layoutRef} className="flex h-screen bg-background overflow-hidden">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar desktop */}
      <div className="hidden lg:flex lg:h-screen lg:sticky lg:top-0">
        <Sidebar />
      </div>

      {/* Sidebar mobile drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-out lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden mr-2 touch-target"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </HeaderBar>

        <main className="flex-1 overflow-y-auto pb-24 lg:pb-6 px-4 sm:px-6 lg:px-8 pt-safe">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <MobileNav />
      </div>
    </div>
  );
}