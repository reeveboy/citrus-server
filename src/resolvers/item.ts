import { Item } from "../entities/Item";
import {
  Arg,
  Ctx,
  Int,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { CreateItemInput } from "../InputTypes/CreateItemInput";
import { UpdateItemInput } from "../InputTypes/UpdateItemInput";
import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";

@Resolver(Item)
export class ItemResolver {
  @Mutation(() => Item)
  @UseMiddleware(isAuth)
  async createItem(
    @Arg("input") input: CreateItemInput,
    @Ctx() { req }: MyContext
  ): Promise<Item> {
    return Item.create({
      ...input,
      ownerId: req.session.userId,
    }).save();
  }

  @Query(() => [Item])
  @UseMiddleware(isAuth)
  async items(@Ctx() { req }: MyContext): Promise<Item[]> {
    return Item.find({ where: { ownerId: req.session.userId } });
  }

  @Mutation(() => Item, { nullable: true })
  @UseMiddleware(isAuth)
  async updateItem(
    @Arg("input") { id, name, rate, category }: UpdateItemInput,
    @Ctx() { req }: MyContext
  ): Promise<Item | null> {
    const item = await Item.findOne({
      where: { item_id: id, ownerId: req.session.userId },
    });

    if (!item) {
      return null;
    }

    item.name = name;
    item.rate = rate;
    item.category = category;

    return item.save();
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deleteItem(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    const item = Item.findOne({
      where: { item_id: id, ownerId: req.session.userId },
    });

    if (!item) {
      return false;
    }

    await Item.delete({ item_id: id, ownerId: req.session.userId });

    return true;
  }
}
