export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: "admin" | "member";
  createdAt: string;
  updatedAt: string;
}