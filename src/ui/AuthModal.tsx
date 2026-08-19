/**
 * FloZ EDA - Authentication Modal Dialog
 * Clean Login & Continue as Guest interface.
 */

import React, { useState } from 'react';
import { AuthService, User } from '../core/auth';
import { User as UserIcon, Lock, Mail, ShieldCheck, ArrowRight, CheckCircle2, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md select-none p-4">
      <div className="bg-cad-panel border border-cad-border w-[440px] max-w-full rounded-xl shadow-2xl overflow-hidden flex flex-col text-cad-text">
        {/* Header */}
        <div className="h-12 bg-cad-header border-b border-cad-border px-5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              F
            </div>
            <span className="font-bold text-sm text-cad-text">Account Access</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-cad-text"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-base font-bold text-cad-text">Sign in to FloZ EDA</h2>
            <p className="text-xs text-cad-textMuted">
              Save your projects locally or sync with your engineering workspace.
            </p>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-xs flex items-center gap-2">
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-cad-text font-medium mb-1">Email Address</label>
              <div className="relative flex items-center">
                <Mail size={14} className="absolute left-3 text-cad-textMuted" />
                <input
                  type="email"
                  placeholder="engineer@floz.dev"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-cad-bg border border-cad-border rounded-lg pl-9 pr-3 py-2 text-cad-text font-mono placeholder:text-cad-textMuted focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-cad-text font-medium mb-1">Password</label>
              <div className="relative flex items-center">
                <Lock size={14} className="absolute left-3 text-cad-textMuted" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-cad-bg border border-cad-border rounded-lg pl-9 pr-3 py-2 text-cad-text font-mono placeholder:text-cad-textMuted focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-cad-border w-full" />
            <span className="bg-cad-panel px-3 text-[11px] text-cad-textMuted font-mono uppercase">or</span>
          </div>

          {/* Continue as Guest Button */}
          <button
            onClick={handleGuest}
            type="button"
            className="w-full py-2 bg-cad-subpanel hover:bg-cad-border border border-cad-border text-cad-text font-semibold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <UserIcon size={14} className="text-emerald-500 dark:text-emerald-400" />
            Continue as Guest
          </button>
          <p className="text-[11px] text-center text-cad-textMuted">
            Guest mode provides full access to schematic, PCB layout, 3D viewing, DRC, and manufacturing exports with local storage.
          </p>
        </div>
      </div>
    </div>
  );
};
