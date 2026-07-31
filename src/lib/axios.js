import axios from "axios";

/**
 * Single shared Axios instance for client-side reads (01-architecture.md).
 * Mutations do NOT go through here — those are Server Actions.
 *
 * Relative baseURL so it works in dev, preview and production without an env
 * var; withCredentials so the httpOnly session cookie rides along.
 */
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 15000,
});

/**
 * Turns any failure into a short, plain-language sentence a toast can show.
 * Callers never surface a raw error object or stack trace to a user.
 */
export function readableError(error, fallback = "Something went wrong. Please try again.") {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "That took too long. Check your connection and try again.";
    }
    const serverMessage = error.response?.data?.error;
    if (typeof serverMessage === "string" && serverMessage) return serverMessage;
    if (error.response?.status === 401) return "Your session expired. Please sign in again.";
    if (error.response?.status === 403) return "You don't have permission to view that.";
    if (!error.response) return "Can't reach the server. Check your connection.";
  }
  return fallback;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    /* Attach the readable message so callers can toast it directly. */
    error.readableMessage = readableError(error);
    return Promise.reject(error);
  },
);

export default api;
