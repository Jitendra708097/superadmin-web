/**
 * @module orgApi
 * @description RTK Query endpoints for organisation management.
 *              list, detail, suspend, activate, change plan, extend trial.
 */

import { baseApi } from './baseApi.js';

export const orgApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    getAllOrgs: builder.query({
      query: (params) => ({ url: '/superadmin/organisations', params }),
      providesTags: ['Orgs'],
    }),

    getOrgById: builder.query({
      query: (id) => ({ url: `/superadmin/organisations/${id}` }),
      providesTags: (result, error, id) => [{ type: 'OrgDetail', id }],
    }),

    getOrgEmployees: builder.query({
      query: ({ id, params }) => ({
        url:    `/superadmin/organisations/${id}/employees`,
        params,
      }),
      providesTags: (result, error, { id }) => [{ type: 'OrgDetail', id }],
    }),

    getOrgAttendanceSummary: builder.query({
      query: (id) => ({ url: `/superadmin/organisations/${id}/attendance/today` }),
    }),

    getOrgBillingHistory: builder.query({
      query: ({ id, params }) => ({
        url:    `/superadmin/organisations/${id}/billing`,
        params,
      }),
    }),

    sendBillingAlert: builder.mutation({
      query: ({ id, alertType, customMessage }) => ({
        url: `/superadmin/organisations/${id}/billing/alerts`,
        method: 'POST',
        body: { alertType, customMessage },
      }),
    }),

    createOrg: builder.mutation({
      query: (body) => ({
        url:    '/superadmin/organisations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Orgs', 'Dashboard'],
    }),

    previewOrgSlug: builder.query({
      query: ({ name }) => ({
        url: '/superadmin/organisations/slug-preview',
        params: { name },
      }),
    }),

    suspendOrg: builder.mutation({
      query: ({ id, reason }) => ({
        url:    `/superadmin/organisations/${id}/suspend`,
        method: 'PUT',
        body:   { reason },
      }),
      invalidatesTags: ['Orgs', 'Dashboard'],
    }),

    activateOrg: builder.mutation({
      query: ({ id, reason }) => ({
        url:    `/superadmin/organisations/${id}/activate`,
        method: 'PUT',
        body:   { reason },
      }),
      invalidatesTags: ['Orgs', 'Dashboard'],
    }),

    cancelOrg: builder.mutation({
      query: ({ id, reason }) => ({
        url:    `/superadmin/organisations/${id}/cancel`,
        method: 'PUT',
        body:   { reason },
      }),
      invalidatesTags: ['Orgs', 'Dashboard', { type: 'OrgDetail' }],
    }),

    addOrgNote: builder.mutation({
      query: ({ id, note }) => ({
        url:    `/superadmin/organisations/${id}/notes`,
        method: 'POST',
        body:   { note },
      }),
      invalidatesTags: (result, error, { id }) => ['Orgs', { type: 'OrgDetail', id }],
    }),

    transferOrgOwner: builder.mutation({
      query: ({ id, employeeId, reason }) => ({
        url:    `/superadmin/organisations/${id}/owner`,
        method: 'PUT',
        body:   { employeeId, reason },
      }),
      invalidatesTags: (result, error, { id }) => ['Orgs', { type: 'OrgDetail', id }],
    }),

    resendOrgInvite: builder.mutation({
      query: (id) => ({
        url:    `/superadmin/organisations/${id}/admin-invite/resend`,
        method: 'POST',
      }),
      invalidatesTags: ['Orgs', { type: 'OrgDetail' }],
    }),

    updateOrgProfile: builder.mutation({
      query: ({ id, name, timezone, country }) => ({
        url:    `/superadmin/organisations/${id}/profile`,
        method: 'PUT',
        body:   { name, timezone, country },
      }),
      invalidatesTags: ['Orgs', { type: 'OrgDetail' }],
    }),

    changePlan: builder.mutation({
      query: ({ id, plan, reason, effectiveDate }) => ({
        url:    `/superadmin/organisations/${id}/plan`,
        method: 'PUT',
        body:   { plan, reason, effectiveDate },
      }),
      invalidatesTags: ['Orgs', { type: 'OrgDetail' }],
    }),

    extendTrial: builder.mutation({
      query: ({ id, days, reason }) => ({
        url:    `/superadmin/organisations/${id}/trial`,
        method: 'PUT',
        body:   { extendByDays: days, reason },
      }),
      invalidatesTags: ['Orgs', { type: 'OrgDetail' }],
    }),

    exportOrgs: builder.query({
      query: (params) => ({ url: '/superadmin/organisations/export', params }),
    }),

    searchOrgs: builder.query({
      query: ({ q }) => ({ url: '/superadmin/organisations/search', params: { q } }),
    }),

  }),
  overrideExisting: false,
});

export const {
  useGetAllOrgsQuery,
  useGetOrgByIdQuery,
  useGetOrgEmployeesQuery,
  useGetOrgAttendanceSummaryQuery,
  useGetOrgBillingHistoryQuery,
  useSendBillingAlertMutation,
  useCreateOrgMutation,
  usePreviewOrgSlugQuery,
  useSuspendOrgMutation,
  useActivateOrgMutation,
  useCancelOrgMutation,
  useAddOrgNoteMutation,
  useTransferOrgOwnerMutation,
  useResendOrgInviteMutation,
  useUpdateOrgProfileMutation,
  useChangePlanMutation,
  useExtendTrialMutation,
  useExportOrgsQuery,
  useSearchOrgsQuery,
} = orgApi;
