import {
  Arg,
  Ctx,
  Int,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { MyContext } from "../types";
import { isAuth } from "../middleware/isAuth";
import { Bills } from "../entities/Bills";
import { getConnection } from "typeorm";

@Resolver(Bills)
export class BillResolver {
  @Mutation(() => Bills)
  @UseMiddleware(isAuth)
  async createBill(
    @Arg("table_no", () => Int) table_no: number,
    @Ctx() { req }: MyContext
  ): Promise<Bills> {
    if (table_no < 1) {
      throw new Error("Table Number must be greater than 0");
    }

    return Bills.create({
      table_no,
      ownerId: req.session.userId,
    }).save();
  }

  @Query(() => Bills, { nullable: true })
  async getBill(
    @Arg("bill_id", () => Int) bill_id: number,
    @Ctx() { req }: MyContext
  ): Promise<Bills | undefined> {
    const bill = await Bills.findOne({
      where: { bill_id, ownerId: req.session.userId },
    });

    if (!bill) {
      return undefined;
    }

    return getConnection()
      .getRepository(Bills)
      .createQueryBuilder("b")
      .leftJoinAndSelect("b.orders", "orders")
      .where("b.bill_id = :id", { id: bill_id })
      .getOne();
  }

  @Query(() => [Bills], { nullable: true })
  @UseMiddleware(isAuth)
  async getUnsettledBills(@Ctx() { req }: MyContext): Promise<Bills[] | null> {
    const bills = await Bills.find({
      where: { ownerId: req.session.userId, is_settled: false },
    });

    if (!bills) {
      return null;
    }

    return bills;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deleteBill(
    @Arg("bill_id", () => Int) bill_id: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    const bill = await Bills.findOne({
      where: { bill_id, ownerId: req.session.userId },
    });

    if (!bill) {
      return false;
    }

    if (bill.is_settled) {
      throw new Error("bill is alreeady setled");
    }

    await Bills.delete(bill_id);

    return true;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async settleBill(
    @Arg("bill_id", () => Int) bill_id: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    const bill = await Bills.findOne({
      where: { bill_id, ownerId: req.session.userId },
    });

    if (!bill || bill.is_settled) {
      return false;
    }

    bill.is_settled = true;
    await bill.save();

    return true;
  }
}
