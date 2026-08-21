// ----------------------------------------------------------------------

const THAI_ERROR_MESSAGES: Record<string, string> = {
  'Invalid username or password': 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
  'Invalid login credentials': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  'Email not confirmed': 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ',
  'User not found': 'ไม่พบบัญชีผู้ใช้นี้',
};

function translateErrorMessage(message: string) {
  return THAI_ERROR_MESSAGES[message.trim()] ?? message;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return translateErrorMessage(error.message || error.name || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
  }

  if (typeof error === 'string') {
    return translateErrorMessage(error);
  }

  if (typeof error === 'object' && error !== null) {
    const errorMessage = (error as { message?: string }).message;
    if (typeof errorMessage === 'string') {
      return translateErrorMessage(errorMessage);
    }
  }

  return 'เกิดข้อผิดพลาด กรุณาลองใหม่';
}
