import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('labels')
export class Label {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  /** Hex color string e.g. "#6366f1" */
  @Column({ type: 'varchar', length: 7, default: '#6366f1' })
  color: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
