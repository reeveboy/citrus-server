import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Category } from "./Category";
import { Orders } from "./Orders";
import { User } from "./User";

@ObjectType()
@Entity()
export class Item extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  item_id!: number;

  @Field()
  @Column()
  name!: string;

  @Field()
  @Column()
  rate!: number;

  @Field()
  @Column({ type: "int" })
  category_id!: number;
  @ManyToOne(() => Category, (category) => category.items)
  @JoinColumn({ name: "category_id" })
  category: Category;

  @Field()
  @Column()
  ownerId: number;
  @ManyToOne(() => User, (user) => user.items)
  @JoinColumn({ name: "ownerid" })
  owner: User;

  @OneToMany(() => Orders, (order) => order.item)
  orders: Orders[];

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
