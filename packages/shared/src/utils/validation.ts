export const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,16}$/;
export const ROOM_CODE_REGEX = /^[A-Z0-9]{5}$/;

export const isValidUsername = (name: string): boolean => USERNAME_REGEX.test(name.trim());

export const isValidRoomCode = (code: string): boolean => ROOM_CODE_REGEX.test(code.trim());

export const sanitizeMessage = (value: string): string =>
  value
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
