import { test, expect } from '@playwright/test';
import { signUpUser, createGroup, createTrip } from './helpers.js';

test.describe('Expenses Tab E2E Tests', () => {
  let destination;

  test.beforeEach(async ({ page }) => {
    await signUpUser(page, 'Ian');
    const groupName = `Group-${Date.now()}`;
    await createGroup(page, groupName);
    destination = `Tokyo-${Date.now()}`;
    await createTrip(page, groupName, destination);
    
    // Go to the trip page
    await page.locator('.trip-card', { hasText: destination }).click();
    await page.waitForURL(/\/trip\/\d+\//);

    // Switch to Expenses tab
    await page.click('button[data-tab="expenses"]');
  });

  test('should render expenses tab and handle logging an expense', async ({ page }) => {
    // Verify tab pane visibility
    await expect(page.locator('#tab-expenses')).toBeVisible();

    // Verify initial values
    const summaryBox = page.locator('#expense-summary');
    await expect(summaryBox).toContainText('0.00');
    await expect(summaryBox).toContainText('Total Trip Expenses');

    // Verify sidebar expenses summary
    const sidebarExpenses = page.locator('#sidebar-expenses');
    await expect(sidebarExpenses).toContainText('0.00');

    // Fill expense form
    await page.fill('#expense-amount', '75.50');
    await page.fill('#expense-description', 'Sushi dinner at Tsujiki');
    await page.selectOption('#expense-category', 'Food');

    // Submit expense
    await page.click('button:has-text("Add Expense")');

    // Verify expense lists in the summary list
    await expect(summaryBox.locator('strong', { hasText: 'Sushi dinner at Tsujiki' })).toBeVisible();
    
    // Total spent should update to 75.50
    await expect(summaryBox).toContainText('75.50');
    
    // Sidebar should reflect the updated amount
    await expect(sidebarExpenses).toContainText('75.50');
  });
});
