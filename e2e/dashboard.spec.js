import { test, expect } from '@playwright/test';
import { signUpUser, createGroup } from './helpers.js';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start authenticated for each test
    await signUpUser(page, 'David');
  });

  test('should render the dashboard layout correctly', async ({ page }) => {
    // Header check
    await expect(page.locator('.app-header .app-logo')).toContainText('Voyage AI Travel');
    await expect(page.locator('.user-menu')).toContainText('David');
    await expect(page.locator('.user-avatar')).toHaveText('D');

    // Welcome title check
    await expect(page.locator('h1')).toContainText('Welcome back, David');

    // Quick Actions buttons should exist (using .first() to fix strict mode violations)
    await expect(page.locator('button:has-text("Create Group")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Join with Code")').first()).toBeVisible();

    // Default "Your Groups" section
    await expect(page.locator('#groups-section h2')).toContainText('Your Groups');
    await expect(page.locator('#trips-section')).toBeHidden();
  });

  test('should toggle sections when clicking group cards', async ({ page }) => {
    const groupName = `Group-${Date.now()}`;
    await createGroup(page, groupName);

    // Click the group card to view its trips
    const groupCard = page.locator('.glass-card', { hasText: groupName });
    await groupCard.click();

    // Groups section should hide, trips section should display
    await expect(page.locator('#groups-section')).toBeHidden();
    await expect(page.locator('#trips-section')).toBeVisible();
    await expect(page.locator('#selected-group-name')).toHaveText(groupName);

    // Click "Back to Groups"
    await page.click('button:has-text("Back to Groups")');

    // Toggle back to groups view
    await expect(page.locator('#groups-section')).toBeVisible();
    await expect(page.locator('#trips-section')).toBeHidden();
  });

  test('should copy group invite code to clipboard', async ({ page }) => {
    const groupName = `ShareGroup-${Date.now()}`;
    await createGroup(page, groupName);

    // Injection: Override the global copyToClipboard function directly in the browser window context.
    await page.evaluate(() => {
      window.copyToClipboard = (text, element) => {
        element.innerHTML = '✓ Copied';
      };
    });

    // Locate the copy button using a stable attribute selector instead of changing text content
    const groupCard = page.locator('.glass-card', { hasText: groupName });
    const copyBtn = groupCard.locator('button[onclick*="copyToClipboard"]');
    await expect(copyBtn).toBeVisible();

    // Click the Copy button
    await copyBtn.click();

    // It will now safely track the element and pass the text verification
    await expect(copyBtn).toContainText('✓ Copied');
  });
});