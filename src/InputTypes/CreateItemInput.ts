import { Length, Min } from "class-validator";
import { Field, InputType, Int } from "type-graphql";

@InputType()
export class CreateItemInput {
  @Field()
  @Length(1, 255)
  name: string;

  @Field()
  @Min(0)
  rate: number;

  @Field(() => Int)
  @Min(1)
  category_id: number;
}
