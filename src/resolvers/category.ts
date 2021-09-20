import { Category } from "../entities/Category";
import { Arg, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";
import { isAuth } from "../middleware/isAuth";

@Resolver(Category)
export class CategoryResolver {
  @Mutation(() => Category)
  @UseMiddleware(isAuth)
  async createCategory(
    @Arg("name", () => String) name: string
  ): Promise<Category> {
    if (name.length <= 2) {
      throw new Error("Category Name length should be atleast 3 characters");
    }
    return Category.create({ name: name.toLocaleUpperCase() }).save();
  }

  @Query(() => [Category])
  @UseMiddleware(isAuth)
  async categories(): Promise<Category[]> {
    return Category.find({});
  }
}
