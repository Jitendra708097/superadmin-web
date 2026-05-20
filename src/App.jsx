/**
 * @module App
 * @description Root application component.
 *              Renders AppRouter and global UI overlays (CommandSearch).
 */

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axiosInstance from '@api/axiosInstance.js';
import AppRouter     from '@routes/AppRouter.jsx';
import CommandSearch from '@components/common/CommandSearch.jsx';
import { logout, tokenRefreshed } from '@store/authSlice.js';

export default function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, accessToken } = useSelector((state) => state.auth);
  const [isRestoringSession, setIsRestoringSession] = useState(isAuthenticated && !accessToken);

  useEffect(() => {
    if (!isAuthenticated || accessToken) {
      setIsRestoringSession(false);
      return;
    }

    let cancelled = false;

    axiosInstance.post('/superadmin/auth/refresh', {})
      .then((response) => {
        if (!cancelled) {
          dispatch(tokenRefreshed(response.data.data));
        }
      })
      .catch(() => {
        if (!cancelled) {
          dispatch(logout());
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsRestoringSession(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, dispatch, isAuthenticated]);

  if (isRestoringSession) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <AppRouter />
      <CommandSearch />
    </>
  );
}
