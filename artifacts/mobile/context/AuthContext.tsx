import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, clearToken, setToken, User } from "@/services/api";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void api.warmup().catch(() => undefined);

    (async () => {
      try {
        const token = await AsyncStorage.getItem("jwt");
        if (token) {
          setToken(token);
          const me = await api.getCurrentUser();
          setUser(me);
        }
      } catch {
        await AsyncStorage.removeItem("jwt");
        clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const me = await api.signin({ email, password });
    const token = (globalThis as any)._filmeraToken as string;
    await AsyncStorage.setItem("jwt", token);
    setUser(me);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    await api.signup({ name, email, password });
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem("jwt");
    clearToken();
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    await api.deleteAccount();
    await AsyncStorage.removeItem("jwt");
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, signup, logout, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
