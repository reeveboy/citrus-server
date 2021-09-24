import { redis } from "../redis";
import { CONFIRM_USER_PREFIX } from "../constants";

export const createVerificationCode = async (userId: number) => {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10).toLocaleString();
  }
  await redis.set(CONFIRM_USER_PREFIX + code, userId, "ex", 60 * 60 * 24); // 1 day expiration

  return code;
};
