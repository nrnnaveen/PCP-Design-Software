/**
 * FloZ ECA — Authentication Dialog
 * Clean Login, Sign Up & Continue as Guest interface powered by Supabase.
 */

import React, { useState } from 'react';
import { AuthService, User } from '../core/auth';
import { Lock, Mail, ArrowRight, X, User as UserIcon, Loader2, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: User) => void;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      let user: User;
      if (mode === 'signup') {
        user = await AuthService.signUp(trimmed, password, name.trim());
      } else {
        user = await AuthService.login(trimmed, password);
      }
      onAuthSuccess?.(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    const guest = AuthService.loginAsGuest();
    onAuthSuccess?.(guest);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-labelledby="auth-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-theme-modalBackdrop select-none p-4"
    >
      <div className="bg-cad-panel border border-cad-border w-[400px] max-w-full rounded-sm shadow-xl overflow-hidden flex flex-col text-cad-text animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="h-9 bg-cad-header border-b border-cad-border px-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-xs bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              F
            </div>
            <h2 id="auth-dialog-title" className="font-semibold text-xs sm:text-sm text-cad-textHeading">
              {mode === 'login' ? 'Account Sign In' : 'Create Account'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-textMuted hover:text-cad-text transition-colors duration-fast focus-visible:outline-none"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5">
          <div className="text-center space-y-0.5">
            <h3 className="text-xs font-semibold text-cad-textHeading">
              {mode === 'login' ? 'Sign in to FloZ ECA' : 'Register your FloZ Account'}
            </h3>
            <p className="text-[11px] text-cad-textMuted">
              {mode === 'login'
                ? 'Save your projects locally or sync with Supabase cloud.'
                : 'Turn prompts into multi-layer PCB designs with cloud backup.'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex rounded-xs bg-cad-subpanel border border-cad-border p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(null); }}
              className={`flex-1 py-1 text-center font-medium rounded-xs transition-colors ${
                mode === 'login' ? 'bg-cad-panel text-cad-textHeading shadow-xs' : 'text-cad-textMuted hover:text-cad-text'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(null); }}
              className={`flex-1 py-1 text-center font-medium rounded-xs transition-colors ${
                mode === 'signup' ? 'bg-cad-panel text-cad-textHeading shadow-xs' : 'text-cad-textMuted hover:text-cad-text'
              }`}
            >
              Create Account
            </button>
          </div>

          {errorMsg && (
            <div className="p-2 rounded-xs bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5 text-xs">
            {mode === 'signup' && (
              <div>
                <label className="block text-cad-text font-medium mb-1 text-[11px]">Your Name</label>
                <div className="relative flex items-center">
                  <UserIcon size={13} className="absolute left-2.5 text-cad-textMuted" />
                  <input
                    type="text"
                    placeholder="Alex Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-cad-inputBg border border-cad-inputBorder rounded-xs pl-7 pr-2.5 py-1 text-xs text-cad-inputText placeholder:text-cad-textMuted focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-cad-text font-medium mb-1 text-[11px]">Email Address</label>
              <div className="relative flex items-center">
                <Mail size={13} className="absolute left-2.5 text-cad-textMuted" />
                <input
                  type="email"
                  placeholder="engineer@floz.dev"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded-xs pl-7 pr-2.5 py-1 text-xs text-cad-inputText font-mono placeholder:text-cad-textMuted focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-cad-text font-medium mb-1 text-[11px]">Password</label>
              <div className="relative flex items-center">
                <Lock size={13} className="absolute left-2.5 text-cad-textMuted" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded-xs pl-7 pr-2.5 py-1 text-xs text-cad-inputText font-mono placeholder:text-cad-textMuted focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xs text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors duration-fast focus-visible:outline-none"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In' : 'Register Account'}</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </form>

          <div className="relative flex items-center justify-center py-0.5">
            <div className="border-t border-cad-border w-full" />
            <span className="bg-cad-panel px-2 text-[10px] text-cad-textMuted font-mono uppercase">or</span>
          </div>

          {/* Continue as Guest Button */}
          <button
            onClick={handleGuest}
            type="button"
            className="w-full py-1 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border text-cad-text font-medium rounded-xs text-xs flex items-center justify-center gap-1.5 transition-colors duration-fast shadow-xs focus-visible:outline-none"
          >
            <UserIcon size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span>Continue as Guest</span>
          </button>

          {/* Cloud Sync Status */}
          <div className="pt-2 border-t border-cad-border/60 text-center">
            <span className="text-[10px] text-cad-textMuted flex items-center justify-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${AuthService.isCloudEnabled() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{AuthService.isCloudEnabled() ? 'Connected to Supabase' : 'Local Mode (Supabase not configured)'}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
