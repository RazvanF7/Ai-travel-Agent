import { test, expect } from '@playwright/test';

test.describe('Landing Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render the landing page with title and hero section', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/AI Travel Hub/);

    // Check hero header logo text
    const logoText = page.locator('.hero-header');
    await expect(logoText).toContainText('Voyage AI Travel');

    // Check hero heading title
    const mainTitle = page.locator('.hero-title');
    await expect(mainTitle).toContainText('Your Personal AI Travel Agent');
  });

  test('should display recommended destinations and features', async ({ page }) => {
    // Verify features grid is loaded
    const features = page.locator('.features-grid .feature-card');
    await expect(features).toHaveCount(4);
    await expect(features.first()).toContainText('AI-Powered Planning');

    // Verify destinations grid is loaded
    const destinations = page.locator('.destinations-grid .destination-card');
    await expect(destinations).toHaveCount(5);
    await expect(destinations.first()).toContainText('Kyoto');
  });

  test('should navigate to login page when clicking Plan a Trip', async ({ page }) => {
    // Click the call-to-action button in navigation
    const planTripBtn = page.locator('.hero-nav a:has-text("Plan a Trip")');
    await planTripBtn.click();

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login\//);
  });

  test('should interact with the floating AI travel assistant chat widget', async ({ page }) => {
    // Intercept the backend AI network call to mock a successful response
    // This stops unauthenticated requests from triggering a 401 redirect to /login/
    await page.route('**/api/ai/concierge/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: "Suggest a 3-day itinerary for Tokyo",
          reply: "Suggest a 3-day itinerary for Tokyo"
        }),
      });
    });

    // Check if the floating chat button exists and is visible
    const chatBtn = page.locator('#floating-chat-btn');
    await expect(chatBtn).toBeVisible();

    // Click to open chat
    await chatBtn.click();

    // The chat container should be visible and button hidden
    const chatContainer = page.locator('#floating-chat-container');
    await expect(chatContainer).toBeVisible();
    await expect(chatBtn).toBeHidden();

    // Check default greeting
    const greeting = chatContainer.locator('.chat-messages');
    await expect(greeting).toContainText('Hi there! I am your personal AI Travel Assistant');

    // Type a question in the input field
    const chatInput = page.locator('#floating-chat-container #chat-input');
    await chatInput.fill('Suggest a 3-day itinerary for Tokyo');

    // Click send
    const sendBtn = page.locator('#floating-chat-container #btn-send');
    await sendBtn.click();

    // Check that user message is added to the messages list
    const messages = page.locator('#floating-chat-container .chat-messages');
    await expect(messages).toContainText('Suggest a 3-day itinerary for Tokyo');

    // Close the chat widget
    const closeBtn = page.locator('#close-chat-btn');
    await closeBtn.click();

    // Widget should close, floating button visible again
    await expect(chatContainer).toBeHidden();
    await expect(chatBtn).toBeVisible();
  });
});