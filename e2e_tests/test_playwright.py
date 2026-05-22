import re
from playwright.sync_api import Page, expect

def test_google_or_whatever(page: Page):
    # Let's see if we can load a page locally
    page.goto("https://playwright.dev/python/")
    
    # Assert the title has the correct text
    expect(page).to_have_title(re.compile("Playwright"))