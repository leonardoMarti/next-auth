import axios from "axios";
import { parseCookies, setCookie } from "nookies";
import { signOut } from "../contexts/AuthContenxt";
import { AuthTokenError } from "../errors/AuthTokenError";

let isRefreshing = false;
let failedRequestQueue = [];

export function setupApiClient(ctx = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: "http://localhost:3333",
    headers: {
      Authorization: `Bearer ${cookies["nextauth.token"]}`,
    },
  });

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response.status === 401) {
        if (error.response.data?.code === "token.expired") {
          cookies = parseCookies(ctx);

          const { "nextauth.refreshToken": refreshToken } = cookies;
          const originalConnfig = error.config;

          if (!isRefreshing) {
            isRefreshing = true;

            api
              .post("/refresh", {
                refreshToken,
              })
              .then((response) => {
                const { token } = response.data;

                setCookie(ctx, "nextauth.token", token, {
                  maxAge: 60 * 60 * 24 * 30,
                  path: "/",
                });

                setCookie(
                  ctx,
                  "nextauth.refreshToken",
                  response.data.refreshToken,
                  {
                    maxAge: 60 * 60 * 24 * 30,
                    path: "/",
                  }
                );

                api.defaults.headers["Authorization"] = `Bearer ${token}`;

                failedRequestQueue.forEach((request) =>
                  request.onSuccess(token)
                );
                failedRequestQueue = [];
              })
              .catch((error) => {
                failedRequestQueue.forEach((request) =>
                  request.onFailure(error)
                );
                failedRequestQueue = [];

                if (typeof window === "undefined") {
                  signOut();
                } else {
                  return Promise.reject(new AuthTokenError());
                }
              })
              .finally(() => {
                isRefreshing = false;
              });
          }

          return new Promise((resolve, rejects) => {
            failedRequestQueue.push({
              onSuccess: (token: string) => {
                originalConnfig.headers["Authorization"] = `Bearer ${token}`;

                resolve(api(originalConnfig));
              },
              onFailure: (error) => {
                rejects(error);
              },
            });
          });
        } else {
          signOut();
        }
      }
      return Promise.reject(error);
    }
  );
  return api;
}
