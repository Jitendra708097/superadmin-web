import { baseApi } from './baseApi.js';

export const feedbackApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFeedback: builder.query({
      query: (params) => ({ url: '/superadmin/feedback', params }),
      providesTags: ['Feedback'],
    }),

    getFeedbackSummary: builder.query({
      query: (params) => ({ url: '/superadmin/feedback/summary', params }),
      providesTags: ['Feedback'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetFeedbackQuery,
  useGetFeedbackSummaryQuery,
} = feedbackApi;
