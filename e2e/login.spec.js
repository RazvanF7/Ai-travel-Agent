import { test, expect } from '@playwright/test';

test.describe('Login & Sign Up E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login/');
  });

  test('should render sign in form by default', async ({ page }) => {
    // Check main title
    await expect(page.locator('h1')).toContainText('Voyage AI Travel');
    
    // Sign In form should be visible, Sign Up hidden
    await expect(page.locator('#signin-form')).toBeVisible();
    await expect(page.locator('#signup-form')).toBeHidden();

    // Check tabs styling
    await expect(page.locator('#tab-signin')).toHaveClass(/btn-secondary/);
    await expect(page.locator('#tab-signup')).toHaveClass(/btn-ghost/);
  });

  test('should switch tabs between Sign In and Sign Up', async ({ page }) => {
    // Click Sign Up tab
    await page.click('#tab-signup');
    await expect(page.locator('#signup-form')).toBeVisible();
    await expect(page.locator('#signin-form')).toBeHidden();
    await expect(page.locator('#tab-signup')).toHaveClass(/btn-secondary/);
    await expect(page.locator('#tab-signin')).toHaveClass(/btn-ghost/);

    // Click Sign In tab
    await page.click('#tab-signin');
    await expect(page.locator('#signin-form')).toBeVisible();
    await expect(page.locator('#signup-form')).toBeHidden();
    await expect(page.locator('#tab-signin')).toHaveClass(/btn-secondary/);
  });

  test('should register a new user successfully and redirect to dashboard', async ({ page }) => {
    const uniqueEmail = `test_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`;

    // Switch to signup tab
    await page.click('#tab-signup');

    // Fill registration form
    await page.fill('#signup-first-name', 'Alice');
    await page.fill('#signup-last-name', 'Tester');
    await page.fill('#signup-email', uniqueEmail);
    await page.fill('#signup-password', 'SecurePassword123!');

    // Submit form
    await page.click('#signup-submit');

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard/');
    await expect(page).toHaveURL(/\/dashboard\//);

    // Welcome text in dashboard should contain the user's first name
    await expect(page.locator('h1')).toContainText('Welcome back, Alice');

    // User menu avatar should show 'A'
    await expect(page.locator('.user-avatar')).toHaveText('A');
  });

  test('should display error message on invalid sign in', async ({ page }) => {
    // Try to login with non-existent credentials
    await page.fill('#signin-email', 'invaliduser@example.com');
    await page.fill('#signin-password', 'WrongPassword123!');
    await page.click('#signin-submit');

    // Verify error is displayed
    const errorMsg = page.locator('#signin-error');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText('Invalid email or password');
  });

  test('should log out successfully and redirect to landing page', async ({ page }) => {
    // First register / login a user
    const uniqueEmail = `test_logout_${Date.now()}@example.com`;
    await page.click('#tab-signup');
    await page.fill('#signup-first-name', 'Bob');
    await page.fill('#signup-last-name', 'Tester');
    await page.fill('#signup-email', uniqueEmail);
    await page.fill('#signup-password', 'SecurePassword123!');
    await page.click('#signup-submit');
    await page.waitForURL('**/dashboard/');

    // Click logout in the header
    await page.click('a:has-text("Logout")');

    // Should redirect back to landing page
    await page.waitForURL('**/');
    await expect(page).toHaveURL(/\/$/);
  });
});
