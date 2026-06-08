import { test, expect } from '@playwright/test';
import { signUpUser } from './helpers.js';

test.describe('Group Modal Actions E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await signUpUser(page, 'Grace');
  });

  test('should open, validate, and close the Create Group modal', async ({ page }) => {
    const modal = page.locator('#create-group-modal');
    
    // Initial hidden state
    await expect(modal).toBeHidden();

    // Open modal
    await page.click('button:has-text("Create Group")');
    await expect(modal).toBeVisible();

    // Close modal via ✕
    await modal.locator('.modal-close').click();
    await expect(modal).toBeHidden();

    // Reopen and submit valid form
    await page.click('button:has-text("Create Group")');
    const groupName = `Adventure Squad ${Date.now()}`;
    await page.fill('#group-name', groupName);
    await page.click('#create-group-btn');

    // Page should reload/update and list the new group card
    await expect(modal).toBeHidden();
    await expect(page.locator('.glass-card', { hasText: groupName })).toBeVisible();
  });

  test('should open, validate, and close the Join Group modal', async ({ page }) => {
    const modal = page.locator('#join-group-modal');
    
    // Initial hidden state
    await expect(modal).toBeHidden();

    // Open modal
    await page.click('button:has-text("Join with Code")');
    await expect(modal).toBeVisible();

    // Close modal via ✕
    await modal.locator('.modal-close').click();
    await expect(modal).toBeHidden();

    // Reopen and try to join with invalid code
    await page.click('button:has-text("Join with Code")');
    await page.fill('#invite-code', 'WRONG123'); // Max length is 8
    await page.click('#join-group-btn');

    // Verify error is rendered
    const errorMsg = page.locator('#join-group-error');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/Failed|Invalid|error/i);
  });
});
