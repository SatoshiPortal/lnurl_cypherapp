import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

// CREATE TABLE lnurl_withdraw (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   msatoshi INTEGER,
//   description TEXT,
//   expiration INTEGER,
//   secret_token TEXT UNIQUE,
//   webhook_url TEXT,
//   calledback INTEGER DEFAULT false,
//   calledback_ts INTEGER,
//   lnurl TEXT,
//   bolt11 TEXT,
//   withdrawn_details TEXT,
//   withdrawn_ts INTEGER,
//   active INTEGER,
//   created_ts INTEGER DEFAULT CURRENT_TIMESTAMP,
//   updated_ts INTEGER DEFAULT CURRENT_TIMESTAMP
// );
// CREATE INDEX idx_lnurl_withdraw_description ON lnurl_withdraw (description);
// CREATE INDEX idx_lnurl_withdraw_lnurl ON lnurl_withdraw (lnurl);
// CREATE INDEX idx_lnurl_withdraw_bolt11 ON lnurl_withdraw (bolt11);

@Entity("lnurl_withdraw")
export class LnurlWithdrawEntity {
  @PrimaryGeneratedColumn({ name: "id" })
  lnurlWithdrawId!: number;

  @Column({ type: "integer", name: "msatoshi" })
  msatoshi!: number;

  @Index("idx_lnurl_withdraw_description")
  @Column({ type: "text", name: "description", nullable: true })
  description?: string;

  @Column({ type: "integer", name: "expiration", nullable: true })
  expiration?: Date;

  @Column({ type: "text", name: "secret_token", unique: true })
  secretToken!: string;

  @Column({ type: "text", name: "webhook_url", nullable: true })
  webhookUrl?: string;

  @Column({
    type: "integer",
    name: "calledback",
    nullable: true,
    default: false,
  })
  calledback?: boolean;

  @Column({ type: "integer", name: "calledback_ts", nullable: true })
  calledbackTimestamp?: Date;

  @Index("idx_lnurl_withdraw_lnurl")
  @Column({ type: "text", name: "lnurl", nullable: true })
  lnurl?: string;

  @Index("idx_lnurl_withdraw_bolt11")
  @Column({ type: "text", name: "bolt11", nullable: true })
  bolt11?: string;

  @Column({ type: "text", name: "withdrawn_details", nullable: true })
  withdrawnDetails?: string;

  @Column({ type: "integer", name: "withdrawn_ts", nullable: true })
  withdrawnTimestamp?: Date;

  @Column({ type: "integer", name: "active", nullable: true, default: true })
  active?: boolean;

  @CreateDateColumn({ type: "integer", name: "created_ts" })
  createdAt?: Date;

  @UpdateDateColumn({ type: "integer", name: "updated_ts" })
  updatedAt?: Date;
}
