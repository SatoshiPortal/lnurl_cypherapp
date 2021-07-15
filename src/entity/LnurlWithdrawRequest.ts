import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from "typeorm";

// CREATE TABLE lnurl_withdraw_request (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   amount REAL,
//   description TEXT,
//   expiration INTEGER,
//   secret_token TEXT UNIQUE,
//   webhook_url TEXT,
//   lnurl TEXT,
//   withdrawn_details TEXT,
//   withdrawn_ts INTEGER,
//   active INTEGER,
//   created_ts INTEGER DEFAULT CURRENT_TIMESTAMP,
//   updated_ts INTEGER DEFAULT CURRENT_TIMESTAMP
// );
// CREATE INDEX idx_lnurl_withdraw_description ON lnurl_withdraw (description);
// CREATE INDEX idx_lnurl_withdraw_lnurl ON lnurl_withdraw (lnurl);

@Entity()
export class LnurlWithdrawRequest {
  @PrimaryGeneratedColumn({ name: "id" })
  lnurlWithdrawId!: number;

  @Column({ type: "real", name: "amount" })
  amount!: number;

  @Index("idx_lnurl_withdraw_description")
  @Column({ type: "text", name: "description", nullable: true })
  description?: string;

  @Column({ type: "integer", name: "expiration", nullable: true })
  expiration?: Date;

  @Column({ type: "text", name: "secret_token", unique: true })
  secretToken!: string;

  @Column({ type: "text", name: "webhook_url", nullable: true })
  webhookUrl?: string;

  @Index("idx_lnurl_withdraw_lnurl")
  @Column({ type: "text", name: "lnurl", nullable: true })
  lnurl?: string;

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
