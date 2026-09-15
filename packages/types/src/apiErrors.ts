/**
 * The one typed error vocabulary the server and every client share.
 * A server response never leaks a raw Postgres/driver error message to
 * the UI — see docs/QR-SECURITY.md and docs/ARCHITECTURE.md "API error
 * model". Postgres functions in infra/db/migrations raise exceptions
 * whose message text is exactly one of these codes.
 */
export const API_ERROR_CODES = [
  "QR_EXPIRED",
  "QR_USED",
  "QR_INVALID",
  "WRONG_QR_PURPOSE",
  "REWARD_INACTIVE",
  "REWARD_NOT_FOUND",
  "INSUFFICIENT_POINTS",
  "REDEMPTION_NOT_FOUND",
  "REDEMPTION_ALREADY_COMPLETED",
  "ORDER_NOT_FOUND",
  "ORDER_ALREADY_ASSIGNED",
  "ORDER_ALREADY_REWARDED",
  "FORBIDDEN",
  "UNAUTHENTICATED",
  "INVALID_CREDENTIALS",
  "VALIDATION",
  "INTERNAL",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export const API_ERROR_MESSAGES_RU: Record<ApiErrorCode, string> = {
  QR_EXPIRED: "QR-код истёк. Попросите гостя открыть новый.",
  QR_USED: "Этот QR-код уже был использован.",
  QR_INVALID: "QR-код не распознан.",
  WRONG_QR_PURPOSE: "Этот QR-код нельзя использовать для данной операции.",
  REWARD_INACTIVE: "Награда сейчас недоступна.",
  REWARD_NOT_FOUND: "Награда не найдена.",
  INSUFFICIENT_POINTS: "Недостаточно баллов.",
  REDEMPTION_NOT_FOUND: "Операция не найдена.",
  REDEMPTION_ALREADY_COMPLETED: "Награда уже была выдана.",
  ORDER_NOT_FOUND: "Заказ не найден.",
  ORDER_ALREADY_ASSIGNED: "Этот заказ уже недоступен для привязки.",
  ORDER_ALREADY_REWARDED: "Баллы за этот заказ уже начислены.",
  FORBIDDEN: "Недостаточно прав для этого действия.",
  UNAUTHENTICATED: "Нужно войти в систему.",
  INVALID_CREDENTIALS: "Неверный email или пароль.",
  VALIDATION: "Проверьте введённые данные.",
  INTERNAL: "Что-то пошло не так. Попробуйте ещё раз.",
};

export function isApiErrorCode(value: string): value is ApiErrorCode {
  return (API_ERROR_CODES as readonly string[]).includes(value);
}
