import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the API client
const mockApiFn = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClient: (...args: unknown[]) => mockApiFn(...args),
}));

// Mock the auth store — use vi.fn() inside factory to avoid hoisting issues
const mockSetAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) => {
    const state = { setAuth: mockSetAuth, token: null, user: null, logout: vi.fn() };
    return selector ? selector(state) : state;
  },
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Import after mocks
import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFn.mockResolvedValue({
      access_token: "test-token",
      user: { id: "1", email: "test@test.com", role: "admin", displayName: "Test User" },
    });
  });

  it("renders email and password inputs and submit button", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("calls setAuth on successful login", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "test@test.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(
        "test-token",
        expect.objectContaining({ email: "test@test.com" }),
      );
    });
  });

  it("shows error message on failed login", async () => {
    mockApiFn.mockRejectedValueOnce(new Error("Invalid credentials"));

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "bad@test.com");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it("disables submit button while loading", async () => {
    mockApiFn.mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "test@test.com");
    await user.type(screen.getByLabelText(/password/i), "password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
  });
});