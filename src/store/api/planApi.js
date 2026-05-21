import { baseApi } from './baseApi.js';

export const planApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPlans: builder.query({
      query: () => ({ url: '/superadmin/plans' }),
      providesTags: ['Plans'],
    }),

    savePlan: builder.mutation({
      query: ({ code, ...body }) => ({
        url: `/superadmin/plans/${code}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Plans', 'Orgs', 'Billing', 'Dashboard'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPlansQuery,
  useSavePlanMutation,
} = planApi;
