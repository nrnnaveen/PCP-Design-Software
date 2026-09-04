/**
 * FloZ ECA — Authentication: Sign Up
 * Uses the unified animated auth flow with signup mode as default.
 */

import React from 'react';
import { Login } from './Login';
import { User } from '../../core/auth';

interface SignupProps {
  onAuthSuccess?: (user: User) => void;
  onSwitchToLogin?: () => void;
  onNavigateHome?: () => void;
}

export const Signup: React.FC<SignupProps> = (props) => {
  return <Login {...props} initialMode="signup" />;
};
