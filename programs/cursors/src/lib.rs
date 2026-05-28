use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::MagicIntentBundleBuilder;

declare_id!("EbgjnmbNznJPqZkFwFkZ8AUcPpDoBkSEKEv2LM5NfLD7");

pub const CURSOR_SEED: &[u8] = b"cursor";

#[ephemeral]
#[program]
pub mod cursors {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, color: u32) -> Result<()> {
        let c = &mut ctx.accounts.cursor;
        c.owner = ctx.accounts.user.key();
        c.x = 0;
        c.y = 0;
        c.color = color;
        c.last_update = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn move_cursor(ctx: Context<MoveCursor>, x: i32, y: i32) -> Result<()> {
        let c = &mut ctx.accounts.cursor;
        c.x = x;
        c.y = y;
        c.last_update = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn delegate(ctx: Context<DelegateInput>) -> Result<()> {
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[CURSOR_SEED, ctx.accounts.payer.key().as_ref()],
            DelegateConfig {
                validator: ctx.remaining_accounts.first().map(|a| a.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    pub fn move_and_commit(ctx: Context<CommitCursor>, x: i32, y: i32) -> Result<()> {
        let c = &mut ctx.accounts.cursor;
        c.x = x;
        c.y = y;
        c.last_update = Clock::get()?.unix_timestamp;
        c.exit(&crate::ID)?;
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit(&[ctx.accounts.cursor.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }

    pub fn undelegate(ctx: Context<CommitCursor>) -> Result<()> {
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[ctx.accounts.cursor.to_account_info()])
        .build_and_invoke()?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 4 + 4 + 4 + 8,
        seeds = [CURSOR_SEED, user.key().as_ref()],
        bump,
    )]
    pub cursor: Account<'info, Cursor>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MoveCursor<'info> {
    #[account(mut, seeds = [CURSOR_SEED, payer.key().as_ref()], bump)]
    pub cursor: Account<'info, Cursor>,
    pub payer: Signer<'info>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateInput<'info> {
    pub payer: Signer<'info>,
    /// CHECK: PDA to delegate
    #[account(mut, del)]
    pub pda: UncheckedAccount<'info>,
}

#[commit]
#[derive(Accounts)]
pub struct CommitCursor<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, seeds = [CURSOR_SEED, payer.key().as_ref()], bump)]
    pub cursor: Account<'info, Cursor>,
}

#[account]
pub struct Cursor {
    pub owner: Pubkey,
    pub x: i32,
    pub y: i32,
    pub color: u32,
    pub last_update: i64,
}
