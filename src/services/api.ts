import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && token !== "null" && token !== "undefined") {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (token === "null" || token === "undefined") {
    localStorage.removeItem("token");
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      // If the token is invalid, expired, or rejected
      const isInvalidToken = 
        status === 401 || 
        (status === 403 && (
          !data || 
          data?.message === "Invalid token" || 
          data?.message === "Forbidden" || 
          (typeof data === "string" && data.includes("Invalid token"))
        ));

      if (isInvalidToken) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth-logout"));
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
