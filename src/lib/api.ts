// src/lib/api.ts
import { getApiBase } from './config';

const API_BASE = getApiBase();

export interface ApiError {
  error: string;
  details?: string;
}

export interface Project {
  id: string;
  orgId: string;
  projectKey: string;
  name: string;
  description: string | null;
  repoUrl: string | null;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  applicationCount?: number;
  totalRuns?: number;
  lastRunAt?: string | null;
}

export interface Application {
  id: string;
  name: string;
  appKey: string;
  runnerType: 'playwright' | 'selenium' | 'api';
  repoUrl: string | null;
  frameworkVersion: string | null;
  createdAt: string;
}

export interface TestRun {
  id: string;
  applicationId: string;
  applicationName: string;
  appKey: string;
  runId: string;
  status: string;
  runnerType?: string;
  jobNumber?: number | null;
  jobPrefix?: string | null;
  branch: string | null;
  commitSha: string | null;
  ciBuildNumber: string | null;
  environment: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
}

export interface TestExecution {
  id: string;
  testKey: string;
  status: string;
  durationMs: number | null;
  errorMessage: string | null;
  errorStack: string | null;
  createdAt: string;
}

export interface RunSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  runningTests: number;
}

export interface ApiKey {
  id: string;
  projectId: string;
  label: string;
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
}

export interface Organization {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  projectCount?: number;
  applicationCount?: number;
  totalRuns?: number;
  memberCount?: number;
}

export interface TeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: RoleAssignment[];
  createdAt: string;
  lastActiveAt?: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isEmailVerified: boolean;
  roles: RoleAssignment[];
}

export interface RoleAssignment {
  role: string;
  scope: 'SYSTEM' | 'ORGANIZATION' | 'PROJECT';
  scopeId: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  organization: {
    id: string;
    name: string;
  };
}

// Token storage helpers
export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },
  
  setAccessToken: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', token);
  },
  
  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  },
  
  setRefreshToken: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('refreshToken', token);
  },
  
  clearTokens: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
  
  setTokens: (tokens: AuthTokens): void => {
    tokenStorage.setAccessToken(tokens.accessToken);
    tokenStorage.setRefreshToken(tokens.refreshToken);
  },
};

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<AuthTokens> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async refreshAccessToken(): Promise<AuthTokens> {
    // If already refreshing, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;

    this.refreshPromise = (async () => {
      try {
        const refreshToken = tokenStorage.getRefreshToken();

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const data = await response.json();
        const newTokens: AuthTokens = data.tokens;

        // Store new tokens
        tokenStorage.setTokens(newTokens);

        return newTokens;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    retryCount = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Get access token from storage
    let accessToken = tokenStorage.getAccessToken();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          ...options?.headers,
        },
      });

      // Handle 401 Unauthorized - token expired (skip for auth endpoints)
      const isAuthEndpoint = endpoint.startsWith('/auth/');
      if (response.status === 401 && retryCount === 0 && !isAuthEndpoint) {
        console.log('[API] Access token expired, refreshing...');

        try {
          // Refresh the token
          await this.refreshAccessToken();

          // Retry the request with new token
          return this.request<T>(endpoint, options, retryCount + 1);
        } catch (refreshError) {
          console.error('[API] Token refresh failed:', refreshError);

          // Clear tokens and force re-login
          tokenStorage.clearTokens();

          // Redirect to login page
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }

          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(error.error || 'Request failed');
      }

      return response.json();
    } catch (error) {
      // Don't log 401 errors twice (already handled above)
      if (!(error instanceof Error && error.message.includes('Session expired'))) {
        console.error(`API request failed: ${endpoint}`, error);
      }
      throw error;
    }
  }
   auth = {
    register: async (data: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      organizationName: string;
    }): Promise<RegisterResponse> => {
      return this.request<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    login: async (data: {
      email: string;
      password: string;
    }): Promise<LoginResponse> => {
      return this.request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    logout: async (refreshToken: string): Promise<void> => {
      await this.request<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    },

    getCurrentUser: async (): Promise<AuthUser> => {
      const data = await this.request<{ user: AuthUser }>('/auth/me');
      return data.user;
    },

    refreshToken: async (refreshToken: string): Promise<AuthTokens> => {
      const data = await this.request<{ tokens: AuthTokens }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      return data.tokens;
    },

    verifyEmail: async (token: string): Promise<void> => {
      await this.request<void>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
    },

    forgotPassword: async (email: string): Promise<void> => {
      await this.request<void>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    resetPassword: async (token: string, newPassword: string): Promise<void> => {
      await this.request<void>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
    },

    updateProfile: async (data: {
      firstName?: string;
      lastName?: string;
    }): Promise<void> => {
      await this.request<void>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    changePassword: async (data: {
      currentPassword: string;
      newPassword: string;
    }): Promise<void> => {
      await this.request<void>('/auth/password', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  };

  // Organizations
  organizations = {
    list: async (): Promise<Organization[]> => {
      const data = await this.request<{ organizations: Organization[] }>(
        '/organizations'
      );
      return data.organizations;
    },

    get: async (orgId: string): Promise<Organization> => {
      const data = await this.request<{ organization: Organization }>(
        `/organizations/${orgId}`
      );
      return data.organization;
    },

    update: async (orgId: string, data: {
      name?: string;
      description?: string;
    }): Promise<Organization> => {
      const result = await this.request<{ organization: Organization }>(
        `/organizations/${orgId}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      );
      return result.organization;
    },

    listMembers: async (orgId: string): Promise<TeamMember[]> => {
      const data = await this.request<{ members: TeamMember[] }>(
        `/organizations/${orgId}/members`
      );
      return data.members;
    },

    listInvitations: async (orgId: string): Promise<PendingInvitation[]> => {
      const data = await this.request<{ invitations: PendingInvitation[] }>(
        `/organizations/${orgId}/invitations`
      );
      return data.invitations;
    },

    inviteMember: async (orgId: string, data: {
      email: string;
      role: string;
    }): Promise<{ invitation: { email: string; role: string; acceptUrl: string } }> => {
      return this.request<{ invitation: { email: string; role: string; acceptUrl: string } }>(`/organizations/${orgId}/invitations`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateMemberRole: async (orgId: string, userId: string, role: string): Promise<void> => {
      await this.request<void>(`/organizations/${orgId}/members/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
    },

    removeMember: async (orgId: string, userId: string): Promise<void> => {
      await this.request<void>(`/organizations/${orgId}/members/${userId}`, {
        method: 'DELETE',
      });
    },
  };

  // Projects
  projects = {
    list: async (orgId: string): Promise<Project[]> => {
      const data = await this.request<{ projects: Project[] }>(
        `/organizations/${orgId}/projects`
      );
      return data.projects;
    },

    get: async (orgId: string, projectKey: string): Promise<Project> => {
      const data = await this.request<{ project: Project }>(
        `/organizations/${orgId}/projects/${projectKey}`
      );
      return data.project;
    },

    create: async (
      orgId: string,
      input: {
        projectKey: string;
        name: string;
        description?: string;
        repoUrl?: string;
        defaultBranch?: string;
      }
    ): Promise<Project> => {
      const data = await this.request<{ project: Project }>(
        `/organizations/${orgId}/projects`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        }
      );
      return data.project;
    },

    update: async (
      orgId: string,
      projectKey: string,
      input: {
        name?: string;
        description?: string;
        repoUrl?: string;
        defaultBranch?: string;
      }
    ): Promise<Project> => {
      const data = await this.request<{ project: Project }>(
        `/organizations/${orgId}/projects/${projectKey}`,
        {
          method: 'PUT',
          body: JSON.stringify(input),
        }
      );
      return data.project;
    },

    delete: async (orgId: string, projectKey: string): Promise<void> => {
      await this.request<void>(
        `/organizations/${orgId}/projects/${projectKey}`,
        { method: 'DELETE' }
      );
    },

    listApiKeys: async (orgId: string, projectKey: string): Promise<ApiKey[]> => {
      const data = await this.request<{ apiKeys: ApiKey[] }>(
        `/organizations/${orgId}/projects/${projectKey}/api-keys`
      );
      return data.apiKeys;
    },

    createApiKey: async (
      orgId: string,
      projectKey: string,
      input: { label: string }
    ): Promise<{ apiKey: ApiKey; plainKey: string }> => {
      const data = await this.request<{ apiKey: ApiKey; plainKey: string }>(
        `/organizations/${orgId}/projects/${projectKey}/api-keys`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        }
      );
      return data;
    },

    revokeApiKey: async (keyId: string): Promise<void> => {
      await this.request<void>(`/api-keys/${keyId}`, { method: 'DELETE' });
    },
  };

  // Applications
  applications = {
    list: async (projectKey: string, orgId: string): Promise<Application[]> => {
      const data = await this.request<{ applications: Application[] }>(
        `/projects/${projectKey}/applications?orgId=${orgId}`
      );
      return data.applications;
    },

    get: async (
      projectKey: string,
      appKey: string,
      orgId: string
    ): Promise<Application> => {
      const data = await this.request<{ application: Application }>(
        `/projects/${projectKey}/applications/${appKey}?orgId=${orgId}`
      );
      return data.application;
    },

    create: async (
      projectKey: string,
      orgId: string,
      input: {
        name: string;
        appKey: string;
        runnerType: 'playwright' | 'selenium' | 'api';
        repoUrl?: string;
        frameworkVersion?: string;
      }
    ): Promise<Application> => {
      const data = await this.request<{ application: Application }>(
        `/projects/${projectKey}/applications?orgId=${orgId}`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        }
      );
      return data.application;
    },
  };

  // Test Runs
  runs = {
    list: async (filters?: {
      projectKey?: string;
      appKey?: string;
      runnerType?: string;
      status?: string;
      limit?: number;
    }): Promise<TestRun[]> => {
      const params = new URLSearchParams();
      if (filters?.projectKey) params.set('projectKey', filters.projectKey);
      if (filters?.appKey) params.set('appKey', filters.appKey);
      if (filters?.runnerType) params.set('runnerType', filters.runnerType);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.limit) params.set('limit', filters.limit.toString());

      const query = params.toString();
      const data = await this.request<{ runs: TestRun[] }>(
        `/runs${query ? `?${query}` : ''}`
      );
      return data.runs;
    },

    get: async (runId: string): Promise<TestRun> => {
      const data = await this.request<{ run: TestRun }>(`/runs/${runId}`);
      return data.run;
    },

    getExecutions: async (runId: string): Promise<TestExecution[]> => {
      const data = await this.request<{ executions: TestExecution[] }>(
        `/runs/${runId}/executions`
      );
      return data.executions;
    },

    getSummary: async (runId: string): Promise<RunSummary> => {
      const data = await this.request<{ summary: RunSummary }>(
        `/runs/${runId}/summary`
      );
      return data.summary;
    },
  };

  // API Keys (legacy - prefer using projects.listApiKeys, etc)
  apiKeys = {
    list: async (orgId: string, projectKey: string): Promise<ApiKey[]> => {
      const data = await this.request<{ apiKeys: ApiKey[] }>(
        `/organizations/${orgId}/projects/${projectKey}/api-keys`
      );
      return data.apiKeys;
    },

    create: async (
      orgId: string,
      projectKey: string,
      label: string
    ): Promise<{ apiKey: ApiKey; plainKey: string }> => {
      const data = await this.request<{
        apiKey: ApiKey;
        plainKey: string;
      }>(`/organizations/${orgId}/projects/${projectKey}/api-keys`, {
        method: 'POST',
        body: JSON.stringify({ label }),
      });
      return data;
    },

    revoke: async (keyId: string): Promise<void> => {
      await this.request<void>(`/api-keys/${keyId}`, { method: 'DELETE' });
    },
  };

  // Users
  users = {
    updatePreferences: async (preferences: {
      theme?: 'dark' | 'light' | 'system';
      dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
      timeFormat?: '12h' | '24h';
      defaultTimeRange?: '7d' | '30d' | '90d';
      timezone?: string;
    }): Promise<void> => {
      await this.request<void>('/users/me/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences),
      });
    },

    getPreferences: async (): Promise<{
      theme: 'dark' | 'light' | 'system';
      dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
      timeFormat: '12h' | '24h';
      defaultTimeRange: '7d' | '30d' | '90d';
      timezone: string;
    }> => {
      const data = await this.request<{
        preferences: {
          theme: 'dark' | 'light' | 'system';
          dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
          timeFormat: '12h' | '24h';
          defaultTimeRange: '7d' | '30d' | '90d';
          timezone: string;
        }
      }>('/users/me/preferences');
      return data.preferences;
    },
  };

  invitations = {
    accept: async (token: string, data?: {
      password?: string;
      firstName?: string;
      lastName?: string;
    }): Promise<{ user: { id: string; email: string; firstName: string | null; lastName: string | null } }> => {
      return this.request(`/invitations/${token}/accept`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      });
    },

    cancel: async (id: string): Promise<void> => {
      return this.request(`/invitations/${id}`, { method: 'DELETE' });
    },
  };
}

export const api = new ApiClient(API_BASE);