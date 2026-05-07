import { toast } from "sonner";

interface ApiError {
  status: number;
  message: string;
  data?: Record<string, unknown>;
}

export function handleApiError(error: ApiError) {
  switch (error.status) {
    case 401:
      toast.error("Sessão expirada. Por favor, faça login novamente.");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      break;
    case 403:
      toast.error("Permissão negada.");
      break;
    case 404:
      toast.error("Recurso não encontrado.");
      break;
    case 422:
      toast.error(error.message || "Erro de validação.");
      break;
    case 500:
      toast.error("Erro interno do servidor. Tente novamente mais tarde.");
      console.error("Server error:", error);
      break;
    default:
      toast.error(error.message || "Ocorreu um erro.");
  }
}

export async function parseApiError(response: Response): Promise<ApiError> {
  const status = response.status;
  let message = response.statusText;
  let data: Record<string, unknown> | undefined;

  try {
    const json = await response.json();
    message = json.message || json.error || response.statusText;
    data = json;
  } catch {
    // Response body is not JSON
  }

  return { status, message, data };
}
