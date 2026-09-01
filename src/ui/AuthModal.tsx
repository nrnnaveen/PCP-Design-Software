/**
 * FloZ ECA — Microsoft Fluent Authentication Dialog
 * Clean Login & Continue as Guest interface.
 */

import React, { useState } from 'react';
import { AuthService, User } from '../core/auth';
import { Lock, Mail, ArrowRight, X, User as UserIcon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: User) => void;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const user = await AuthService.login(email, password);
      onAuthSuccess?.(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please try again.');
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 select-none p-4"
    >
      <div className="bg-cad-panel border border-cad-border w-[420px] max-w-full rounded-lg shadow-2xl overflow-hidden flex flex-col text-cad-text animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="h-11 bg-cad-header border-b border-cad-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              F
            </div>
            <h2 id="auth-dialog-title" className="font-semibold text-xs sm:text-sm text-cad-textHeading">
              Account Access
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 hover:bg-cad-surfaceHover rounded text-cad-textMuted hover:text-cad-text transition-colors focus-visible:outline-none"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="text-center space-y-0.5">
            <h3 className="text-sm font-semibold text-cad-textHeading">Sign in to FloZ ECA</h3>
            <p className="text-xs text-cad-textMuted">
              Save your projects locally or sync with your engineering workspace.
            </p>
          </div>

          {errorMsg && (
            <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3 text-xs">
            <div>
              <label className="block text-cad-text font-medium mb-1">Email Address</label>
              <div className="relative flex items-center">
                <Mail size={13} className="absolute left-2.5 text-cad-textMuted" />
                <input
                  type="email"
                  placeholder="engineer@floz.dev"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded pl-8 pr-3 py-1.5 text-xs text-cad-inputText font-mono placeholder:text-cad-textMuted focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-cad-text font-medium mb-1">Password</label>
              <div className="relative flex items-center">
                <Lock size={13} className="absolute left-2.5 text-cad-textMuted" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded pl-8 pr-3 py-1.5 text-xs text-cad-inputText font-mono placeholder:text-cad-textMuted focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors focus-visible:outline-none"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight size={13} />
            </button>
          </form>

          <div className="relative flex items-center justify-center py-1">
            <div className="border-t border-cad-border w-full" />
            <span className="bg-cad-panel px-2.5 text-[10px] text-cad-textMuted font-mono uppercase">or</span>
          </div>

          {/* Continue as Guest Button */}
          <button
            onClick={handleGuest}
            type="button"
            className="w-full py-1.5 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border text-cad-text font-medium rounded text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm focus-visible:outline-none"
          >
            <UserIcon size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span>Continue as Guest</span>
          </button>
          <p className="text-[10px] text-center text-cad-textMuted leading-relaxed">
            Guest mode provides full access to schematic, PCB layout, 3D viewing, DRC, and manufacturing exports with local storage.
          </p>
        </div>
      </div>
    </div>
  );
};
