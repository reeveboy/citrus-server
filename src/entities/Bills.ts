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
import { Orders } from "./Orders";
import { User } from "./User";

@ObjectType()
@Entity()
export class Bills extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  bill_id!: number;

  @Field()
  @Column({ type: "int" })
  table_no!: number;

  @Field()
  @Column({ default: 0.0, type: "float" })
  total: number;

  @Field()
  @Column({ default: 0.0, type: "float" })
  netAmount: number;

  @Column({ default: false })
  is_settled: boolean;

  @Field()
  @Column({ type: "int" })
  ownerId!: number;
  @ManyToOne(() => User, (user) => user.bills)
  @JoinColumn({ name: "ownerId" })
  owner: User;

  @Field(() => [Orders])
  @OneToMany(() => Orders, (order) => order.bill)
  orders: Orders[];

  @Field()
  @Column({ default: 0.0, nullable: true, type: "float" })
  discount: number;

  @Field()
  @Column({ default: 0.0, nullable: true, type: "float" })
  offer: number;

  @Field()
  @Column({ default: 0.0, nullable: true, type: "float" })
  tax: number;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
