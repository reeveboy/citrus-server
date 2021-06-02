import { Bills } from "../entities/Bills";
import { Item } from "../entities/Item";
import { Orders } from "../entities/Orders";
import { AddOrderInput } from "../InputTypes/AddOrderInput";
import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";
import { Arg, Ctx, Int, Mutation, Resolver, UseMiddleware } from "type-graphql";
import { getConnection } from "typeorm";

@Resolver(Orders)
export class OrderResolver {
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async addOrder(
    @Arg("input") { bill_id, item_id, quantity }: AddOrderInput,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    const { userId } = req.session;
    const bill = await Bills.findOne({ where: { bill_id, ownerId: userId } });
    const item = await Item.findOne({ where: { item_id, ownerId: userId } });
    const order = await Orders.findOne({
      where: { item_id, bill_id, owner_id: userId },
    });

    if (!bill || !item) {
      return false;
    }

    if (bill.is_settled) {
      throw new Error("bill is alreeady setled");
    }

    if (order) {
      throw new Error("this order already exists");
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

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async updateOrder(
    @Arg("input") { bill_id, item_id, quantity }: AddOrderInput,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    const { userId } = req.session;
    const bill = await Bills.findOne({ where: { bill_id, ownerId: userId } });
    const item = await Item.findOne({ where: { item_id, ownerId: userId } });
    const order = await Orders.findOne({
      where: { bill_id, item_id, owner_id: userId },
    });

    if (!bill || !item || !order) {
      return false;
    }

    if (bill.is_settled) {
      throw new Error("bill is alreeady setled");
    }

    const oldTotal = order.total;

    order.quantity = quantity;
    order.total = quantity * item.rate;
    await order.save();

    bill.netAmount += order.total - oldTotal;
    await bill.save();

    return true;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deleteOrder(
    @Arg("bill_id", () => Int) bill_id: number,
    @Arg("item_id", () => Int) item_id: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    const { userId } = req.session;
    const bill = await Bills.findOne({ where: { bill_id, ownerId: userId } });
    const order = await Orders.findOne({
      where: { bill_id, item_id, owner_id: userId },
    });

    if (!bill || !order) {
      return false;
    }

    bill.netAmount -= order.total;
    await bill.save();

    await Orders.delete({ item_id, bill_id, owner_id: userId });

    return true;
  }
}