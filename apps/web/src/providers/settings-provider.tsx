"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { createContext, useContext } from "react";

interface PublicSettings {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
}

const SettingsContext = createContext<PublicSettings>({
  companyName: "Onboarding Tracker",
  logoUrl: null,
  primaryColor: "#3B82F6",
});

export function usePublicSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => apiClient<PublicSettings>("/settings/public"),
  });

  return (
    <SettingsContext.Provider value={settings ?? { companyName: "Onboarding Tracker", logoUrl: null, primaryColor: "#3B82F6" }}>
      {children}
    </SettingsContext.Provider>
  );
}