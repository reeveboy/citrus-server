import { Bills } from "../entities/Bills";
import { Item } from "../entities/Item";
import { Orders } from "../entities/Orders";
import { AddOrderInput } from "../InputTypes/AddOrderInput";
import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";
import {
  Arg,
  Ctx,
  FieldResolver,
  Int,
  Mutation,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { getConnection } from "typeorm";

@Resolver(Orders)
export class OrderResolver {
  @FieldResolver(() => String)
  async itemName(@Root() order: Orders) {
    const item = await Item.findOne({ where: { item_id: order.item_id } });
    return item?.name;
  }

  @FieldResolver(() => String)
  async itemRate(@Root() order: Orders) {
    const item = await Item.findOne({ where: { item_id: order.item_id } });
    return item?.rate;
  }

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
      const Total = quantity * item.rate;

      const BillTotal = bill.total + Total;
      const Offer = (BillTotal * bill.discount) / 100;
      const Tax = BillTotal * 0.05;
      const NetAmount = BillTotal + Tax;

      getConnection().transaction(async (tm) => {
        await tm.query(
          `
            update orders
            set quantity = quantity + $1,
                total = total + $2
            where bill_id = $3 and item_id = $4
          `,
          [quantity, Total, bill_id, item_id]
        );

        await tm.query(
          `
          update bills
          set total = $1,
              offer = $2,
              tax = $3,
              "netAmount" = $4
          where bill_id = $5
        `,
          [BillTotal, Offer, Tax, NetAmount, bill_id]
        );
      });

      return true;
    }

    const total = quantity * item.rate;

    const billTotal = bill.total + total;
    const offer = (billTotal * bill.discount) / 100;
    const tax = billTotal * 0.05;
    const netAmount = billTotal + tax - offer;

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
        set total = $1,
            offer = $2,
            tax = $3,
            "netAmount" = $4
        where bill_id = $5
      `,
        [billTotal, offer, tax, netAmount, bill_id]
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

    bill.total += order.total - oldTotal;
    bill.offer = (bill.total * bill.discount) / 100;
    bill.tax = bill.total * 0.05;
    bill.netAmount = bill.total + bill.tax - bill.offer;
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

    bill.total -= order.total;
    bill.offer = (bill.total * bill.discount) / 100;
    bill.tax = bill.total * 0.05;
    bill.netAmount = bill.total + bill.tax - bill.offer;
    await bill.save();

    await Orders.delete({ item_id, bill_id, owner_id: userId });

    return true;
  }
}
