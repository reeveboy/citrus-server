import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";
import bcrypt from "bcryptjs";
import { User } from "../entities/User";
import { MyContext } from "../types";
import { sendEmail } from "../utils/sendEmail";
import { redis } from "../redis";
import { v4 } from "uuid";
import {
  CONFIRM_USER_PREFIX,
  COOKIE_NAME,
  FORGET_PASSWORD_PREFIX,
  FRONTEND_ORIGIN,
} from "../constants";
import { RegisterInput } from "../InputTypes/RegisterInput";
import { ChangePasswordInput } from "../InputTypes/ChangePasswordInput";
import { createVerificationCode } from "../utils/createVerificationCode";

@Resolver(User)
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req }: MyContext): Promise<User | undefined> {
    if (!req.session.userId) {
      return undefined;
    }

    return User.findOne(req.session.userId);
  }

  @Query(() => Boolean)
  async isLogged(@Ctx() { req }: MyContext): Promise<boolean> {
    if (!req.session.userId) {
      return false;
    }

    return true;
  }

  @Mutation(() => User)
  async register(
    @Arg("input") { name, email, password }: RegisterInput,
    @Ctx() { req }: MyContext
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    }).save();

    req.session.userId = user.user_id; // logs in the user

    await sendEmail(user.email, await createVerificationCode(user.user_id));

    return user;
  }

  @Mutation(() => User, { nullable: true })
  async login(
    @Arg("email") email: string,
    @Arg("password") password: string,
    @Ctx() { req }: MyContext
  ): Promise<User | null> {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return null;
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return null;
    }

    req.session.userId = user.user_id;

    return user;
  }

  @Mutation(() => Boolean)
  async confirmUser(@Arg("code") code: string): Promise<boolean> {
    const userId = await redis.get(CONFIRM_USER_PREFIX + code);

    if (!userId) {
      return false;
    }

    await User.update({ user_id: parseInt(userId, 10) }, { confirmed: true });

    redis.del(code);

    return true;
  }

  @Mutation(() => Boolean)
  async resendVerificationCode(@Ctx() { req }: MyContext): Promise<boolean> {
    const user = await User.findOne({ where: { user_id: req.session.userId } });

    if (!user) {
      return false;
    }

    await sendEmail(user.email, await createVerificationCode(user.user_id));

    return true;
  }

  @Mutation(() => Boolean)
  async forgotPassword(@Arg("email") email: string): Promise<boolean> {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return true; // can also throw an error here saying the user was not found
    }

    const token = v4();
    await redis.set(
      FORGET_PASSWORD_PREFIX + token,
      user.user_id,
      "ex",
      60 * 60 * 24
    ); // 1 day expiration

    await sendEmail(email, `${FRONTEND_ORIGIN}/user/change-password/${token}`);

    return true;
  }

  @Mutation(() => User, { nullable: true })
  async changePassword(
    @Arg("data") { token, password }: ChangePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<User | null> {
    const userId = await redis.get(FORGET_PASSWORD_PREFIX + token);

    if (!userId) {
      return null;
    }

    const user = await User.findOne(userId);

    if (!user) {
      return null;
    }

    redis.del(FORGET_PASSWORD_PREFIX + token);

    user.password = await bcrypt.hash(password, 12);

    await user.save();

    req.session.userId = user.user_id;

    return user;
  }

  @Mutation(() => Boolean)
  async logout(@Ctx() { req, res }: MyContext): Promise<boolean> {
    return new Promise((resolve, reject) =>
      req.session.destroy((err) => {
        if (err) {
          console.log(err);
          return reject(false);
        }

        res.clearCookie(COOKIE_NAME);
        return resolve(true);
      })
    );
  }
}
