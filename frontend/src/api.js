import axios from "axios";
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
});
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("crave-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/auth/login")
    )
      window.dispatchEvent(new Event("crave-session-expired"));
    return Promise.reject(error);
  },
);
export const message = (e) =>
  e.response?.data?.message ||
  (e.code === "ECONNABORTED"
    ? "The request timed out. Please try again."
    : "Cannot reach the server. Check that the backend is running.");
export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
