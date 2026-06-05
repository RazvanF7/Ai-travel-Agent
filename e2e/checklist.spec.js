import { test, expect } from '@playwright/test';
import { signUpUser, createGroup, createTrip } from './helpers.js';

test.describe('Checklist Tab E2E Tests', () => {
  let destination;

  test.beforeEach(async ({ page }) => {
    await signUpUser(page, 'Helen');
    const groupName = `Group-${Date.now()}`;
    await createGroup(page, groupName);
    destination = `Paris-${Date.now()}`;
    await createTrip(page, groupName, destination);
    
    // Go to the trip page
    await page.locator('.trip-card', { hasText: destination }).click();
    await page.waitForURL(/\/trip\/\d+\//);

    // Switch to Checklist tab
    await page.click('button[data-tab="checklist"]');
  });

  test('should render checklist page and handle task CRUD lifecycle', async ({ page }) => {
    // Verify checklist tab pane is displayed
    await expect(page.locator('#tab-checklist')).toBeVisible();

    // Verify empty checklist placeholder
    const listContainer = page.locator('#checklist-items');
    await expect(listContainer).toContainText('No items yet');

    // Add a new checklist item
    const itemName = 'Purchase travel insurance';
    await page.fill('#checklist-title', itemName);
    await page.press('#checklist-title', 'Enter');

    // Check that item is added to the checklist
    const createdItem = listContainer.locator('label', { hasText: itemName });
    await expect(createdItem).toBeVisible();

    // Verify item is checked by default as uncompleted (checkbox unchecked)
    const checkbox = createdItem.locator('input[type="checkbox"]');
    await expect(checkbox).not.toBeChecked();

    // Check the sidebar preview update
    const sidebarItem = page.locator('#sidebar-checklist');
    await expect(sidebarItem).toContainText(itemName);

    // Check the checkbox to complete it
    await checkbox.check();

    // Verify style updates to reflect completion (line-through style or text-decoration class check)
    await expect(createdItem.locator('span')).toHaveCSS('text-decoration-line', 'line-through');

    // Sidebar should reflect that no pending tasks are left since we completed the only item
    await expect(sidebarItem).toContainText('No pending tasks');

    // Delete the checklist item
    await listContainer.locator('.btn-ghost').click();

    // Verify it is removed
    await expect(createdItem).toBeHidden();
  });
});
