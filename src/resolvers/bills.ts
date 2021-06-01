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
import { AddBillInput } from "../InputTypes/AddBillInput";
import { Bills } from "../entities/Bills";
import { Item } from "../entities/Item";
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

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async addOrder(
    @Arg("input") { bill_id, item_id, quantity }: AddBillInput,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    const bill = await Bills.findOne(bill_id);
    const item = await Item.findOne(item_id);
    const { userId } = req.session;

    if (!bill || !item) {
      return false;
    }

    if (bill.ownerId !== userId || item.ownerId !== userId) {
      throw new Error("not authorized");
    }

    if (bill.is_settled) {
      throw new Error("bill is alreeady setled");
    }

    const total = quantity * item.rate;

    getConnection().transaction(async (tm) => {
      await tm.query(
        `
        insert into orders 
        (item_id, bill_id, owner_id, quantity, total)
        values ($1, $2, $3, $4, $5)
      `,
        [item_id, bill_id, userId, quantity, total]
      );

      await tm.query(
        `
        update bills
        set "netAmount" = "netAmount" + $1
        where bill_id = $2
      `,
        [total, bill_id]
      );
    });

    return true;
  }

  @Query(() => Bills, { nullable: true })
  async getBill(
    @Arg("bill_id", () => Int) bill_id: number,
    @Ctx() { req }: MyContext
  ): Promise<Bills | undefined> {
    const bill = await Bills.findOne(bill_id);

    if (!bill) {
      return undefined;
    }

    if (bill.ownerId !== req.session.userId) {
      throw new Error("not authorized");
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
      where: { ownerId: req.session.userId },
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
    const bill = await Bills.findOne(bill_id);

    if (!bill) {
      return false;
    }

    if (bill.ownerId !== req.session.userId) {
      throw new Error("not authorized");
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
    const bill = await Bills.findOne(bill_id);

    if (!bill) {
      return false;
    }

    if (bill.ownerId !== req.session.userId) {
      throw new Error("not authorized");
    }

    if (bill.is_settled) {
      throw new Error("bill is alreeady setled");
    }

    bill.is_settled = true;
    await bill.save();

    return true;
  }
}
