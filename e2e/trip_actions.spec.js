import { test, expect } from '@playwright/test';
import { signUpUser, createGroup } from './helpers.js';

test.describe('Trip Creation & Navigation E2E Tests', () => {
  let groupName;

  test.beforeEach(async ({ page }) => {
    await signUpUser(page, 'Elena');
    groupName = `Trip Group-${Date.now()}`;
    await createGroup(page, groupName);
  });

  test('should validate and create a new trip within a group', async ({ page }) => {
    const groupCard = page.locator('.glass-card', { hasText: groupName });

    // Open trip modal
    await groupCard.locator('button:has-text("+ New Trip")').click();
    const modal = page.locator('#create-trip-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#trip-group-name')).toHaveText(groupName);

    // Close modal
    await modal.locator('.modal-close').click();
    await expect(modal).toBeHidden();

    // Reopen and fill details
    await groupCard.locator('button:has-text("+ New Trip")').click();

    const destination = `Rome, Italy E2E-${Date.now()}`;
    await page.fill('#trip-dest', destination);

    // Format dates: today and one week from now
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const formatDate = (date) => date.toISOString().split('T')[0];

    await page.fill('#trip-start', formatDate(today));
    await page.fill('#trip-end', formatDate(nextWeek));
    await page.fill('#trip-budget', '2500');
    await page.selectOption('#trip-currency', 'EUR');
    await page.fill('#trip-desc', 'A grand family adventure.');

    // Submit form
    await page.click('#create-trip-btn');
    await expect(modal).toBeHidden();

    // Verify it exists in the group's trips grid
    await groupCard.click();
    await expect(page.locator('#trips-section')).toBeVisible();

    const tripCard = page.locator('.trip-card', { hasText: destination });
    await expect(tripCard).toBeVisible();
    await expect(tripCard.locator('.badge-success')).toContainText('8 days');
    await expect(tripCard).toContainText(/2500(\.00)? EUR/);

    // Click the trip card to navigate
    await tripCard.click();

    // Should load the trip details page
    await page.waitForURL(/\/trip\/\d+\//);
    await expect(page.locator('.trip-hero-title')).toHaveText(destination);
  });
});
