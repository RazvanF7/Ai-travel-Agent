import { test, expect } from '@playwright/test';
import { signUpUser, createGroup, createTrip } from './helpers.js';

test.describe('AI Travel Concierge E2E Tests', () => {
  let destination;

  test.beforeEach(async ({ page }) => {
    await signUpUser(page, 'Kev');
    const groupName = `Group-${Date.now()}`;
    await createGroup(page, groupName);
    destination = `Berlin-${Date.now()}`;
    await createTrip(page, groupName, destination);
    
    // Go to the trip page
    await page.locator('.trip-card', { hasText: destination }).click();
    await page.waitForURL(/\/trip\/\d+\//);

    // Switch to AI Concierge tab
    await page.click('button[data-tab="concierge"]');
  });

  test('should mock AI Concierge chat query and parse streaming SSE response', async ({ page }) => {
    // Verify concierge tab pane is displayed
    await expect(page.locator('#tab-concierge')).toBeVisible();

    // Verify initial concierge greeting
    const messages = page.locator('#concierge-messages');
    await expect(messages).toContainText("Hi! I'm your AI Concierge");

    // Intercept concierge SSE endpoint and return mock data
    await page.route('**/api/ai/concierge/', async (route) => {
      const sseContent = 
        'data: {"type": "token", "content": "I recommend visiting the Reichstag Building."}\n\n' +
        'data: {"type": "complete"}\n\n';
      
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sseContent,
      });
    });

    // Fill search prompt and send
    await page.fill('#concierge-input', 'What are top spots to visit in Berlin?');
    await page.click('#btn-send-concierge');

    // User message should display in history
    await expect(messages).toContainText('What are top spots to visit in Berlin?');

    // Assistant response should stream and display content
    await expect(messages).toContainText('I recommend visiting the Reichstag Building.');

    // Ensure cursor is removed when stream completes
    const cursor = messages.locator('.cursor');
    await expect(cursor).toBeHidden();
  });
});
