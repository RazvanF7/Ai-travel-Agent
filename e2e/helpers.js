/**
 * Helper utilities for Voyage AI Travel Playwright E2E Tests
 */

/**
 * Registers a new user with a unique email to ensure a clean test state.
 * Automatically handles the signup tab transition and redirects to the dashboard.
 */
export async function signUpUser(page, firstName = 'TestUser') {
  const uniqueEmail = `e2e_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
  const password = 'TestPassword123!';

  await page.goto('/login/');
  
  // Toggle the signup tab
  await page.click('#tab-signup');
  
  // Fill the registration form
  await page.fill('#signup-first-name', firstName);
  await page.fill('#signup-last-name', 'E2E');
  await page.fill('#signup-email', uniqueEmail);
  await page.fill('#signup-password', password);
  
  // Submit the signup form
  await page.click('#signup-submit');
  
  // Wait for the redirection to dashboard
  await page.waitForURL('**/dashboard/');
  
  return { email: uniqueEmail, password, firstName };
}

/**
 * Creates a new group from the dashboard page.
 */
export async function createGroup(page, name) {
  await page.click('button:has-text("Create Group")');
  await page.waitForSelector('#create-group-modal:visible');
  
  await page.fill('#group-name', name);
  await page.click('#create-group-btn');
  
  // Modal should close and page should reload with new group listed
  await page.waitForSelector('#create-group-modal', { state: 'hidden' });
  await page.waitForSelector(`h3:has-text("${name}")`);
}

/**
 * Creates a new trip for a specific group from the dashboard page.
 */
export async function createTrip(page, groupName, destination) {
  // Find the group card and click "+ New Trip"
  const groupCard = page.locator('.glass-card', { hasText: groupName });
  await groupCard.locator('button:has-text("+ New Trip")').click();
  await page.waitForSelector('#create-trip-modal:visible');
  
  // Fill trip details
  await page.fill('#trip-dest', destination);
  
  // Use current date and tomorrow's date
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 2);
  
  const formatDate = (date) => date.toISOString().split('T')[0];
  
  await page.fill('#trip-start', formatDate(today));
  await page.fill('#trip-end', formatDate(tomorrow));
  await page.fill('#trip-budget', '1000');
  await page.selectOption('#trip-currency', 'USD');
  await page.fill('#trip-desc', 'An exciting automated E2E trip.');
  
  await page.click('#create-trip-btn');
  
  // Modal should close and page should update
  await page.waitForSelector('#create-trip-modal', { state: 'hidden' });
  
  // Click on the group card to show its trips section
  await groupCard.click();
  await page.waitForSelector('#trips-section:visible');
  
  // Verify the trip card is present
  const tripCard = page.locator('.trip-card', { hasText: destination });
  await page.waitForSelector(`.trip-card h3:has-text("${destination}")`);
}
