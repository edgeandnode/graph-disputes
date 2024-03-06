"""make auto update on dispute

Revision ID: bce5c0d728a8
Revises: 5f6805babf4e
Create Date: 2021-09-08 17:16:20.282245

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bce5c0d728a8'
down_revision = '5f6805babf4e'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('disputes', 'dispute_id',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.drop_index('disputes_dispute_id_idx', table_name='disputes')
    op.drop_column('disputes', 'id')
    op.drop_index('indexer_indexer_id_idx', table_name='indexer')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_index('indexer_indexer_id_idx', 'indexer', ['indexer_id'], unique=False)
    op.add_column('disputes', sa.Column('id', sa.BIGINT(), autoincrement=True, nullable=True))
    op.create_index('disputes_dispute_id_idx', 'disputes', ['dispute_id'], unique=False)
    op.alter_column('disputes', 'dispute_id',
               existing_type=sa.VARCHAR(),
               nullable=True)
    # ### end Alembic commands ###