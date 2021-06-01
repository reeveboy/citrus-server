import { Min } from "class-validator";
import { Field, InputType, Int } from "type-graphql";

@InputType()
export class AddBillInput {
  @Field(() => Int)
  bill_id: number;

  @Field(() => Int)
  item_id: number;

  @Field(() => Int)
  @Min(1)
  quantity: number;
}
