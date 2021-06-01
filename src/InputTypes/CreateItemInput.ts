import { Length, Min } from "class-validator";
import { Field, InputType } from "type-graphql";

@InputType()
export class CreateItemInput {
  @Field()
  @Length(1, 255)
  name: string;

  @Field()
  @Min(0)
  rate: number;

  @Field()
  @Length(1, 255)
  category: string;
}
