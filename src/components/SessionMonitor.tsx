import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, LogOut, Clock } from 'lucide-react';

export default function SessionMonitor() {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  // We check if a token exists. If not, we don't monitor inactivity
  const token = localStorage.getItem('welinc_token');

  // Ref to track last active timestamp (in milliseconds)
  const lastActiveRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!token) {
      setShowWarning(false);
      return;
    }

    const getInactivityLimit = () => {
      // Allow override via window global for quick testing (e.g., 30 seconds)
      const devLimit = (window as any).__WELINC_INACTIVITY_LIMIT__;
      if (typeof devLimit === 'number') {
        return devLimit * 1000;
      }
      return 15 * 60 * 1000; // 15 minutes standard
    };

    const getWarningPeriod = (limitMs: number) => {
      // If limit is short (e.g. 30 seconds), show warning for 10 seconds
      if (limitMs <= 60000) {
        return 10000; // 10 seconds
      }
      return 60000; // 60 seconds standard
    };

    const handleUserActivity = () => {
      lastActiveRef.current = Date.now();
      // If warning is currently visible, clicking/moving resets it
      if (showWarning) {
        handleExtend();
      }
    };

    // Listen to all major user interaction events
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    // Primary interval checker (runs every 1 second)
    const checkInterval = setInterval(() => {
      const limit = getInactivityLimit();
      const warningPeriod = getWarningPeriod(limit);
      const timeSinceLastActive = Date.now() - lastActiveRef.current;

      if (timeSinceLastActive >= limit) {
        // Exceeded limit: perform auto logout
        clearInterval(checkInterval);
        handleLogoutDueToInactivity();
      } else if (timeSinceLastActive >= limit - warningPeriod) {
        // Inside warning period
        setShowWarning(true);
        const msRemaining = limit - timeSinceLastActive;
        setSecondsRemaining(Math.max(0, Math.ceil(msRemaining / 1000)));
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      clearInterval(checkInterval);
    };
  }, [token, showWarning]);

  const handleExtend = () => {
    lastActiveRef.current = Date.now();
    setShowWarning(false);
  };

  const handleLogoutDueToInactivity = () => {
    localStorage.clear();
    setShowWarning(false);
    // Redirect to Portal with inactivity query parameter
    window.location.href = 'http://localhost:8000/login?inactivity=true';
  };

  const handleManualLogout = () => {
    localStorage.clear();
    setShowWarning(false);
    // Redirect to Portal with logout query parameter
    window.location.href = 'http://localhost:8000/login?logout=true';
  };

  if (!token || !showWarning) return null;

  return (
    <div className="fixed inset-0 bg-[#0d0d0d]/85 backdrop-blur-md flex items-center justify-center p-6 z-[99999] animate-fade-in">
      <div className="bg-[#151b4f] border border-white/10 rounded-3xl w-full max-w-md p-8 shadow-2xl text-center relative overflow-hidden">
        {/* Glowing aura */}
        <div className="absolute -top-20 -left-20 w-48 h-48 rounded-full bg-brand-warning/15 blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-lg shadow-amber-500/5">
          <AlertTriangle className="w-8 h-8 animate-pulse" />
        </div>

        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Session Expiring</h3>
        <p className="text-white/60 text-sm leading-relaxed mb-6">
          You have been idle for a while. For your security, you will be signed out in:
        </p>

        {/* Circular Countdown visual */}
        <div className="w-28 h-28 rounded-full border-4 border-amber-500/20 flex flex-col items-center justify-center mx-auto mb-8 relative">
          <Clock className="w-4 h-4 text-amber-500/45 absolute top-4" />
          <span className="text-3xl font-black text-white tracking-tighter mt-2">{secondsRemaining}</span>
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">seconds</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleManualLogout}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 border border-white/10 text-white/70 hover:text-white rounded-xl text-sm font-semibold hover:bg-white/5 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          <button
            onClick={handleExtend}
            className="flex-2 inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#e8b800] hover:bg-[#d4a600] text-[#1a1f6e] rounded-xl text-sm font-bold transition-all cursor-pointer shadow-lg shadow-amber-500/10"
          >
            Extend Session
          </button>
        </div>
      </div>
    </div>
  );
}
