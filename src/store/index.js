/**
 * @module store
 * @description Redux store configuration.
 *              Combines authSlice, uiSlice, and RTK Query baseApi.
 */

import { configureStore } from '@reduxjs/toolkit';
import { baseApi }        from './api/baseApi.js';
import authReducer        from './authSlice.js';
import uiReducer          from './uiSlice.js';

// Import all feature APIs to register their endpoints
import './api/authApi.js';
import './api/orgApi.js';
import './api/healthApi.js';
import './api/analyticsApi.js';
import './api/auditApi.js';
import './api/billingApi.js';
import './api/impersonateApi.js';
import './api/featureFlagApi.js';

export const store = configureStore({
  reducer: {
    auth:         authReducer,
    ui:           uiReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
  devTools: import.meta.env.DEV,
});
