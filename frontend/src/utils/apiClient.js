import { apiBase } from "../api";
import { auth } from "../Auth/firebase";
import { signOut } from "firebase/auth";

const getAccessToken = async (forceRefresh = false) => {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch (error) {
    console.error('Error getting Firebase token:', error);
    return null;
  }
};

const createApiClient = (baseUrl) => {
  const client = async (url, options = {}, isRetry = false) => {
    const token = await getAccessToken();
    const headers = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    // Let the browser set Content-Type when sending FormData
    if (options.body instanceof FormData) {
      delete headers["Content-Type"];
    }

    const response = await fetch(`${baseUrl}${url}`, {
      ...options,
      headers,
      credentials: "include",
      mode: "cors",
    });

    if (response.status === 401 && !isRetry) {
      const user = auth.currentUser;
      if (user) {
        try {
          console.warn("401 hit. Force-refreshing token and retrying...");
          const freshToken = await getAccessToken(true);
          
          if (!freshToken) {
            throw new Error("Unable to obtain a fresh session token.");
          }

          const retryHeaders = {
            ...headers,
            Authorization: `Bearer ${freshToken}`,
          };
          // Recursive call with isRetry=true to preserve error checking and exceptions
          return await client(url, {
            ...options,
            headers: retryHeaders,
          }, true);
        } catch (refreshError) {
          await signOut(auth);
          window.location.href = '/';
          throw refreshError;
        }
      } else {
        window.location.href = '/';
      }
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json().catch(() => ({}));
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        try {
          const text = await response.text();
          if (text) errorMessage = text;
        } catch {
          // ignore
        }
      }
      throw new Error(errorMessage);
    }

    return response;
  };

  return client;
};

export const apiClient = createApiClient(apiBase);
