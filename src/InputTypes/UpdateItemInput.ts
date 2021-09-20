import { Length, Min } from "class-validator";
import { Field, InputType, Int } from "type-graphql";

@InputType()
export class UpdateItemInput {
  @Field(() => Int)
  id: number;

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
