import React, { createContext, useContext, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import {
  clearSession,
  findAccount,
  readSession,
  subscribeAccounts,
  writeSession,
} from "@/data/accounts";
import type { Account, AccountSession } from "@/data/accounts";
import { activateDoctorWorkspace, getActiveDoctorId } from "@/data/store";

export interface AuthContextType {
  isAuthenticated: boolean;
  session: AccountSession | null;
  user: Account | null;
  login: (session: AccountSession) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<AccountSession | null>(readSession);
  useEffect(() => {
    const refresh = () => {
      const next = readSession();
      if (next?.role === "doctor" && next.accountId !== getActiveDoctorId())
        activateDoctorWorkspace(next.accountId);
      setSession(next);
    };
    const stop = subscribeAccounts(refresh);
    window.addEventListener("storage", refresh);
    return () => {
      stop();
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const login = (candidate: AccountSession) => {
    const account = findAccount(candidate.accountId);
    if (
      !account ||
      account.status !== "Active" ||
      account.credentialVersion !== candidate.credentialVersion
    )
      throw new Error("Your account has changed. Please sign in again.");
    writeSession(candidate);
    if (!readSession()) {
      clearSession();
      throw new Error("Your account is unavailable.");
    }
    if (candidate.role === "doctor")
      activateDoctorWorkspace(candidate.accountId);
    flushSync(() => setSession(candidate));
  };

  const logout = () => {
    clearSession();
    flushSync(() => setSession(null));
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: Boolean(session),
        session,
        user: session ? findAccount(session.accountId) || null : null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
