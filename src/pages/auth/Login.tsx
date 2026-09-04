/**
 * FloZ — Animated Authentication Flow
 * Super cool, clean, and modern Sign In & Sign Up experience.
 * Features an interactive 3D card tilt, animated sliding tab toggle,
 * expanding/collapsing fields, real-time password strength meter,
 * subtle kinetic circuit background, and one-click guest access.
 */

import React, { useState, useMemo, useRef } from 'react';
import { Logo } from '../../components/branding/Logo';
import { AuthService, User } from '../../core/auth';
import { CircuitMotionGraphic } from '../../components/branding/CircuitMotionGraphic';
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';

interface AuthProps {
  initialMode?: 'login' | 'signup';
  onAuthSuccess?: (user: User) => void;
  onSwitchToSignup?: () => void;
  onSwitchToLogin?: () => void;
  onNavigateHome?: () => void;
}

export const Login: React.FC<AuthProps> = ({
  initialMode = 'login',
  onAuthSuccess,
  onSwitchToSignup,
  onSwitchToLogin,
  onNavigateHome,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Subtle 3D Card Hover Tilt
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0, isHovered: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = ((y - centerY) / centerY) * -4;
    const tiltY = ((x - centerX) / centerX) * 4;
    setCardTilt({ x: tiltX, y: tiltY, isHovered: true });
  };

  const handleMouseLeave = () => {
    setCardTilt({ x: 0, y: 0, isHovered: false });
  };

  // Smooth mode toggle
  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setErrorMessage(null);
    if (newMode === 'signup' && onSwitchToSignup) onSwitchToSignup();
    if (newMode === 'login' && onSwitchToLogin) onSwitchToLogin();
  };

  // Password strength calculation
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'bg-cad-border' };
    if (password.length < 6) return { score: 1, label: 'Short', color: 'bg-red-500' };
    let s = 1;
    if (password.length >= 8) s += 1;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) s += 1;
    if (/[A-Z]/.test(password)) s += 1;

    switch (s) {
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-blue-500' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
      default:
        return { score: 1, label: 'Weak', color: 'bg-red-500' };
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      let user: User;
      if (mode === 'signup') {
        user = await AuthService.signUp(trimmedEmail, password, name.trim());
      } else {
        user = await AuthService.login(trimmedEmail, password);
      }
      onAuthSuccess?.(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-cad-bg text-cad-text flex flex-col items-center justify-center p-4 select-none relative overflow-hidden font-sans">
      {/* Kinetic background motion graphic */}
      <CircuitMotionGraphic opacity={0.2} density="low" interactive={true} />

      {/* Top back navigation */}
      {onNavigateHome && (
        <button
          onClick={onNavigateHome}
          className="absolute top-6 left-6 text-xs text-cad-textMuted hover:text-cad-text flex items-center gap-2 transition-colors duration-fast eng-tactile z-20"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </button>
      )}

      {/* Floating Animated Auth Card with subtle 3D tilt */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: cardTilt.isHovered
            ? `perspective(800px) rotateX(${cardTilt.x}deg) rotateY(${cardTilt.y}deg)`
            : 'perspective(800px) rotateX(0deg) rotateY(0deg)',
          transition: cardTilt.isHovered ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out',
        }}
        className="w-full max-w-sm bg-cad-panel border border-cad-border rounded-xl shadow-2xl p-6 sm:p-7 space-y-5 relative z-10 backdrop-blur-md will-change-transform"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Logo size="md" subtitle={false} onClick={onNavigateHome} />
          <h2 className="text-base font-bold text-cad-textHeading pt-1">
            {mode === 'login' ? 'Sign in to FloZ' : 'Create your FloZ Account'}
          </h2>
          <p className="text-xs text-cad-textMuted">
            {mode === 'login'
              ? 'Access your synthesized AI circuit boards and projects'
              : 'Turn natural language prompts into physical circuit boards'}
          </p>
        </div>

        {/* Super Cool Sliding Tab Toggle */}
        <div className="relative flex p-1 bg-cad-subpanel border border-cad-border rounded-lg text-xs font-medium">
          {/* Animated Sliding Background Indicator */}
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-cad-panel border border-cad-border rounded-md shadow-xs transition-all duration-200 ease-out ${
              mode === 'login' ? 'left-1' : 'left-[calc(50%+2px)]'
            }`}
          />

          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-1.5 text-center relative z-10 transition-colors duration-150 ${
              mode === 'login' ? 'text-cad-textHeading font-semibold' : 'text-cad-textMuted hover:text-cad-text'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 py-1.5 text-center relative z-10 transition-colors duration-150 ${
              mode === 'signup' ? 'text-cad-textHeading font-semibold' : 'text-cad-textMuted hover:text-cad-text'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start gap-2 animate-in fade-in duration-150">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Animated Name Field (Expands smoothly for Sign Up) */}
          <div
            className={`transition-all duration-200 ease-in-out overflow-hidden ${
              mode === 'signup' ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
            }`}
          >
            <div className="space-y-1 pb-1">
              <label className="block text-cad-text font-medium text-[11px]">
                Your Name
              </label>
              <div className="relative flex items-center">
                <UserIcon size={14} className="absolute left-3 text-cad-textMuted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Alex Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded-md pl-9 pr-3 py-2 text-xs text-cad-inputText placeholder:text-cad-textMuted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-1">
            <label className="block text-cad-text font-medium text-[11px]">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail size={14} className="absolute left-3 text-cad-textMuted pointer-events-none" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full bg-cad-inputBg border border-cad-inputBorder rounded-md pl-9 pr-3 py-2 text-xs text-cad-inputText placeholder:text-cad-textMuted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <label className="block text-cad-text font-medium text-[11px]">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock size={14} className="absolute left-3 text-cad-textMuted pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full bg-cad-inputBg border border-cad-inputBorder rounded-md pl-9 pr-9 py-2 text-xs text-cad-inputText placeholder:text-cad-textMuted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 text-cad-textMuted hover:text-cad-text p-1 focus:outline-none transition-transform active:scale-90"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Password Strength Meter (Sign Up only) */}
            {mode === 'signup' && password && (
              <div className="mt-2 space-y-1 animate-in fade-in duration-150">
                <div className="grid grid-cols-4 gap-1.5 h-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-full rounded-full transition-all duration-300 ${
                        strength.score >= level ? strength.color : 'bg-cad-border'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-cad-textMuted pt-0.5">
                  <span>Security: <strong className="text-cad-text font-medium">{strength.label}</strong></span>
                  {strength.score >= 3 && (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <Check size={10} /> Good password
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md text-xs flex items-center justify-center gap-2 shadow-xs transition-all duration-fast eng-tactile disabled:opacity-60 mt-2"
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-cad-border/50 text-center">
          <span className="text-[10px] text-cad-textMuted flex items-center justify-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${AuthService.isCloudEnabled() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{AuthService.isCloudEnabled() ? 'Supabase Cloud Auth Active' : 'Local Storage Mode (Supabase not configured)'}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
