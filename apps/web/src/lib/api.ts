/**
 * Anagu — API client (axios)
 * Wraps the NestJS backend with automatic JWT injection and error normalisation.
 */
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { supabase } from "@/lib/supabase";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        return Promise.reject(error);
      }
      const token = data.session?.access_token ?? localStorage.getItem("anagu_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("anagu_token");
      localStorage.removeItem("anagu_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  login:    (email: string, password: string) => api.post("/auth/login", { email, password }),
  register: (body: Record<string, unknown>)   => api.post("/auth/register", body),
};

export const gisApi = {
  verify: (coordinates: [number, number][], opts?: { excludeParcelId?: string; overlapToleranceMetres?: number }) =>
    api.post("/gis/verify", { coordinates, ...opts }),
};

export const applicationsApi = {
  submit:  (body: Record<string, unknown>) => api.post("/applications", body),
  getOne:  (id: string)                    => api.get(`/applications/${id}`),
  approve: (id: string)                    => api.patch(`/applications/${id}/approve`),
  reject:  (id: string, stage: string, reason: string) =>
    api.patch(`/applications/${id}/reject`, { stage, reason }),
};

export const oracleApi = {
  verify: (body: Record<string, unknown>) => api.post("/oracle/verify", body),
};

export const titlesApi = {
  issue:  (body: Record<string, unknown>)   => api.post("/titles/issue", body),
  getOne: (tokenId: string)                 => api.get(`/titles/${tokenId}`),
  revoke: (tokenId: string, ground: 0 | 1, governorPrivateKey: string) =>
    api.post(`/titles/${tokenId}/revoke`, { ground, governorPrivateKey }),
};

export const documentsApi = {
  upload: (applicationId: string, file: File, documentType = "OTHER") => {
    const form = new FormData();
    form.append("file", file);
    form.append("documentType", documentType);
    return api.post(`/documents/${applicationId}/upload`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  list: (applicationId: string) => api.get(`/documents/${applicationId}`),
};

export const auditApi    = { getTrail: (entityType: string, entityId: string) => api.get(`/audit/${entityType}/${entityId}`) };
export const evaluationApi = { runBaseline: (body: Record<string, unknown>) => api.post("/evaluation/baseline", body) };
