import { Field, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { Bills } from "./Bills";
import { Item } from "./Item";

@ObjectType()
@Entity()
export class Orders extends BaseEntity {
  @Field()
  @PrimaryColumn({ type: "int" })
  item_id!: number;
  @ManyToOne(() => Item, (item) => item.orders, { onDelete: "CASCADE" })
  @JoinColumn({ name: "item_id" })
  item: Item;

  @Field()
  @PrimaryColumn({ type: "int" })
  bill_id!: number;
  @ManyToOne(() => Bills, (bill) => bill.orders, { onDelete: "CASCADE" })
  @JoinColumn({ name: "bill_id" })
  bill: Bills;

  @Field()
  @PrimaryColumn({ type: "int" })
  owner_id: number;

  @Field()
  @Column({ type: "int" })
  quantity!: number;

  @Field()
  @Column({ type: "float" }) // maybe remove this and make it a field resolver
  total: number;
}
