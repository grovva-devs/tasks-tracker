import { SettingsProvider } from "@/providers/settings-provider";

export default function PublicBoardLayout({ children }: { children: React.ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}