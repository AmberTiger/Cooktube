"""Add user_id to videos and user index

Revision ID: 0002
Revises: 0001
Create Date: 2025-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add user_id column with a temporary default for existing rows
    op.add_column('videos', sa.Column('user_id', sa.String(length=128), nullable=False, server_default='legacy'))
    # Create helpful indexes
    op.create_index('ix_videos_user_id', 'videos', ['user_id'], unique=False)
    op.create_index('ix_videos_user_created_at', 'videos', ['user_id', 'created_at'], unique=False)
    # Optional: if you want to remove the server_default after backfill, uncomment below (SQLite ignores)
    # with op.batch_alter_table('videos') as batch_op:
    #     batch_op.alter_column('user_id', server_default=None)


def downgrade() -> None:
    op.drop_index('ix_videos_user_created_at', table_name='videos')
    op.drop_index('ix_videos_user_id', table_name='videos')
    op.drop_column('videos', 'user_id')
