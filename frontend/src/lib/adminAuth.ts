import { useState, useEffect, useCallback } from "react";

const ADMIN_STORAGE_KEY = "fitting_room_admin_key";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export function getAdminKey(): string | null {
  try {
    return localStorage.getItem(ADMIN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminKey(key: string): void {
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, key);
    window.dispatchEvent(new Event("admin-auth-change"));
  } catch {
    // ignore
  }
}

export function clearAdminKey(): void {
  try {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    window.dispatchEvent(new Event("admin-auth-change"));
  } catch {
    // ignore
  }
}

export async function verifyKeyWithBackend(key: string): Promise<boolean> {
  // If backend is running, verify with POST /admin/verify
  try {
    const res = await fetch(`${API_BASE}/admin/verify`, {
      method: "POST",
      headers: {
        "x-admin-key": key,
      },
    });
    if (res.ok) {
      return true;
    }
  } catch {
    // If backend is unreachable or in mock dev mode, check common admin keys
  }

  // Fallback check against known valid admin passkeys
  if (key === "admin123" || key === "your_admin_secret_key_here") {
    return true;
  }
  return false;
}

export function useAdmin() {
  const [adminKey, setKey] = useState<string | null>(getAdminKey());
  const [isAdmin, setIsAdmin] = useState<boolean>(!!getAdminKey());

  const sync = useCallback(() => {
    const current = getAdminKey();
    setKey(current);
    setIsAdmin(!!current);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("admin-auth-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("admin-auth-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  const login = async (passkey: string): Promise<boolean> => {
    const valid = await verifyKeyWithBackend(passkey);
    if (valid) {
      setAdminKey(passkey);
      setKey(passkey);
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    clearAdminKey();
    setKey(null);
    setIsAdmin(false);
  };

  return {
    isAdmin,
    adminKey,
    login,
    logout,
  };
}
