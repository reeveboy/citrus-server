import { Field, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Item } from "./Item";

@ObjectType()
@Entity()
export class Category extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  category_id!: number;

  @Field()
  @Column({ nullable: false })
  name!: string;

  @Field(() => [Item])
  @OneToMany(() => Item, (item) => item.category)
  items: Item[];
}
