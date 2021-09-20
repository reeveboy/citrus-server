import { Item } from "../entities/Item";
import {
  Arg,
  Ctx,
  FieldResolver,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { CreateItemInput } from "../InputTypes/CreateItemInput";
import { UpdateItemInput } from "../InputTypes/UpdateItemInput";
import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";
import { Category } from "../entities/Category";
import { getConnection } from "typeorm";

@Resolver(Item)
export class ItemResolver {
  @FieldResolver(() => String)
  async category_name(@Root() item: Item) {
    const category = await Category.findOne({
      where: { category_id: item.category_id },
    });
    return category?.name;
  }

  @Mutation(() => Item)
  @UseMiddleware(isAuth)
  async addItem(
    @Arg("input") input: CreateItemInput,
    @Ctx() { req }: MyContext
  ): Promise<Item> {
    const { category_id } = input;
    if (!Category.findOne({ where: { category_id } })) {
      throw new Error(`Category with id: ${category_id} does not exist`);
    }
    return Item.create({
      ...input,
      ownerId: req.session.userId,
    }).save();
  }

  @Query(() => [Item])
  @UseMiddleware(isAuth)
  async items(
    @Arg("search", () => String, { nullable: true }) search: string | null,
    @Ctx() { req }: MyContext
  ): Promise<Item[]> {
    if (search) {
      search = `%${search}%`;

      return getConnection()
        .getRepository(Item)
        .createQueryBuilder("i")
        .where('i."ownerId" = :id', { id: req.session.userId })
        .andWhere(`i.name ilike :search`, { search })
        .orderBy("i.item_id")
        .getMany();
    }

    return getConnection()
      .getRepository(Item)
      .createQueryBuilder("i")
      .where('i."ownerId" = :id', { id: req.session.userId })
      .orderBy("i.item_id")
      .getMany();
  }

  @Mutation(() => Item, { nullable: true })
  @UseMiddleware(isAuth)
  async updateItem(
    @Arg("input") { id, name, rate, category_id }: UpdateItemInput,
    @Ctx() { req }: MyContext
  ): Promise<Item | null> {
    const item = await Item.findOne({
      where: { item_id: id, ownerId: req.session.userId },
    });

    if (!item) {
      throw new Error(`Item with id: ${id} does not exist`);
    }

    if (!Category.findOne({ where: { category_id } })) {
      throw new Error(`Category with id: ${category_id} does not exist`);
    }

    item.name = name;
    item.rate = rate;
    item.category_id = category_id;

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
