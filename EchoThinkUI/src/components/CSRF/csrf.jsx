import { API_URL, BACKEND_URL } from "../../config";

export function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

export async function getCSRFToken() {
  await fetch(`${API_URL}/csrf/`, {
    method: "GET",
    credentials: "include", // necessário para cookie ser setado
  });
}

export async function isAuthenticated() {
  const response = await fetch(`${BACKEND_URL}/me/`, {
    method: "GET",
    credentials: "include",
  });

  return response.status === 200;
}

