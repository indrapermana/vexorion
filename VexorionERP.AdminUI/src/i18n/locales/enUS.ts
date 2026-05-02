const enUS = {
  common: {
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    loading: 'Loading...',
  },
  routeGuards: {
    checkingSession: 'Checking session...',
    loadingWorkspace: 'Loading workspace...',
  },
  login: {
    title: 'Admin Sign In',
    description: 'Sign in to manage tenants and system configuration.',
    tenantCode: 'Tenant code',
    emailOrUsername: 'Email or username',
    password: 'Password',
    signingIn: 'Signing in...',
    signInButton: 'Sign in',
    systemAdminOnly: 'SystemAdmin only',
    helpHint: 'Use tenant code demo with your SystemAdmin credentials in development.',
  },
  pages: {
    tenantManagement: {
      loadingTools: 'Loading tenant tools...',
      description: 'Manage all tenants registered in the system. Only visible to system administrators.',
      metrics: {
        rows: 'Total tenants',
        active: 'Active tenants',
      },
    },
  },
  components: {
    tenants: {
      grid: {
        codePrefix: 'Code:',
        noDomain: 'No domain',
        active: 'Active',
        inactive: 'Inactive',
        columns: {
          tenant: 'Tenant',
          domain: 'Domain',
          createdAt: 'Created',
          status: 'Status',
          actions: 'Actions',
        },
      },
      editor: {
        editTitle: 'Edit Tenant',
        loading: 'Loading tenant details...',
        nameLabel: 'Tenant name',
        codeLabel: 'Tenant code',
        codeHelperText: 'Code cannot be changed after creation.',
        domainLabel: 'Domain',
        activeLabel: 'Active',
        errors: {
          save: 'Unable to save tenant right now.',
        },
      },
    },
  },
}

export default enUS
