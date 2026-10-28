import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot, Github, AlertTriangle } from 'lucide-react';

export default function Landing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const errorMsg = searchParams.get('error');

  useEffect(() => {
    if (errorMsg) {
      // Clear it from URL after brief delay if you want, but for now just show it
      console.error("Auth Error:", errorMsg);
    }
  }, [errorMsg]);

  return (
    <div className="h-screen flex flex-col bg-base text-text font-sans overflow-hidden select-none relative z-0">
      {errorMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-xl backdrop-blur-md flex items-center gap-3 border border-red-400">
          <AlertTriangle size={20} />
          <span className="font-semibold">Authentication failed: {errorMsg}</span>
          <button onClick={() => setSearchParams({})} className="ml-4 hover:opacity-70 transition-opacity font-bold">×</button>
        </div>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accentSoft/30 via-base to-base -z-10 pointer-events-none" />
      <div className="absolute inset-0 w-full h-full flex -z-10 opacity-100 pointer-events-none">
        {[
          { h: '60%', c: 'from-purple-800', d: '0s', dur: '8s' },
          { h: '80%', c: 'from-purple-700', d: '-2s', dur: '10s' },
          { h: '95%', c: 'from-purple-600', d: '-4s', dur: '9s' },
          { h: '100%', c: 'from-purple-500', d: '-1s', dur: '12s' },
          { h: '85%', c: 'from-purple-600', d: '-5s', dur: '11s' },
          { h: '70%', c: 'from-purple-700', d: '-3s', dur: '9s' },
          { h: '50%', c: 'from-purple-800', d: '-6s', dur: '10s' },
        ].map((pillar, i) => (
          <div key={i} className="flex-1 h-full relative flex items-end">
            <div 
              className={`w-full bg-gradient-to-t ${pillar.c} via-purple-900/40 to-transparent blur-[40px] sm:blur-[60px] animate-aurora`}
              style={{ 
                height: pillar.h, 
                animationDelay: pillar.d, 
                animationDuration: pillar.dur 
              }} 
            />
          </div>
        ))}
      </div>
      <nav className="flex-none flex items-center justify-between px-6 sm:px-8 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <img src="/favicon.png" alt="Flux Logo" className="w-8 h-8" />
          <span className="text-xl font-bold tracking-wide">FLUX</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-5">
          <button
            onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/github`}
            className="flex items-center gap-2 px-5 py-2 rounded-md bg-[#24292F] hover:bg-[#24292F]/90 text-white text-sm font-semibold transition-colors shadow-lg shadow-black/20"
          >
            <Github className="w-4 h-4" />
            Login with GitHub
          </button>
        </div>
      </nav>
      <div id="scroll-container" className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
        <section className="min-h-[150vh] sm:min-h-[180vh] relative">
          <div className="sticky top-0 h-[calc(100vh-72px)] w-full flex flex-col items-center justify-start pt-16 sm:pt-24 px-4 text-center">
            <div className="z-20 flex flex-col items-center max-w-4xl relative">
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[5rem] font-bold tracking-tight mb-5 leading-tight text-white">
                Code together, build faster.
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white/70 max-w-2xl mb-10 font-medium">
                The ultimate minimalist, collaborative code editor for teams. 
                Real-time editing, debugging, and AI-powered coding.
              </p>
              
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-full backdrop-blur-md mb-16 shadow-2xl">
                <button
                  onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/github`}
                  className="px-6 py-2.5 sm:px-8 sm:py-3 rounded-full bg-white text-black font-semibold text-sm sm:text-base hover:bg-white/90 transition-colors flex items-center gap-2"
                >
                  <Bot size={18} />
                  git commit -m "with love"
                </button>

              </div>
            </div>
          </div>
          
          <div className="absolute top-[80vh] sm:top-[85vh] left-0 w-full z-30 pb-32">
            <LazyVideo />
          </div>
        </section>
        <section className="w-full relative flex flex-col justify-end overflow-hidden pt-32 pb-0">
          <footer className="w-full relative flex items-end justify-center">
            <div className="relative w-full flex justify-center text-center select-none pointer-events-none z-0">
              <h1 className="text-[25vw] font-bold uppercase text-transparent bg-clip-text bg-gradient-to-b from-white/30 via-white/90 to-white leading-[0.8] tracking-tighter m-0 p-0 translate-y-[10%] w-full whitespace-nowrap">
                Flux
              </h1>
              <div className="absolute bottom-0 left-0 w-full h-[60%] bg-gradient-to-t from-base to-transparent" />
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}

function LazyVideo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [scale, setScale] = useState(0.9);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [isVisible]);
  useEffect(() => {
    const scrollEl = document.getElementById('scroll-container');
    if (!scrollEl) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPos = scrollEl.scrollTop;
          const newScale = Math.min(1, 0.9 + (scrollPos / 600) * 0.1);
          setScale(newScale);
          ticking = false;
        });
        ticking = true;
      }
    };

    scrollEl.addEventListener('scroll', handleScroll);
    handleScroll(); 
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full flex justify-center max-w-5xl mx-auto px-4 z-10 relative will-change-transform"
      style={{ transform: `scale(${scale})` }}
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-accent/20 blur-[80px] rounded-full -z-10 animate-pulse" />

      <div className="relative rounded-xl overflow-hidden border border-border/80 shadow-[0_0_50px_-12px_rgba(79,140,255,0.25)] w-full backdrop-blur-sm bg-panel/80">
        <div className="absolute top-0 left-0 w-full h-7 sm:h-8 bg-panel border-b border-border flex items-center px-3 sm:px-4 gap-1.5 sm:gap-2 z-10">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500" />
        </div>

        {isVisible ? (
          <video
            ref={videoRef}
            src="/video.mp4"
            loop
            muted
            playsInline
            preload="none"
            className="w-full h-auto mt-7 sm:mt-8 bg-panel"
          />
        ) : (
          <div className="w-full aspect-video mt-7 sm:mt-8 bg-panel" />
        )}
      </div>
    </div>
  );
}