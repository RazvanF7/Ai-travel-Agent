import re
import pytest
from playwright.sync_api import Page, expect

# @pytest.mark.skip(reason="Requires frontend and backend servers to be running")
def test_successful_login(page: Page):
    """
    E2E Test to verify a successful login with standard email.
    
    This is configured to skip by default unless the dev servers are
    specifically active. You can run this in CI (GitHub Actions) once 
    the frontend and backend services are launched in the background.
    """
    # Navigate to the frontend login page (defaults to localhost:5173)
    page.goto("http://localhost:5173/login")
    
    # Assert we are on the correct page
    expect(page).to_have_title(re.compile("AI Travel Hub", re.IGNORECASE))
    
    # Fill in the Login form fields
    page.fill("#login-name", "Test Traveler")
    page.fill("#login-email", "traveler@aitravelhub.com")
    
    # Submit the form
    page.click("button[type='submit']")
    
    # Wait for navigation/redirection to the dashboard
    page.wait_for_url("**/dashboard")
    
    # Verify dashboard elements are loaded
    expect(page).to_have_url(re.compile(r"/dashboard$"))
    expect(page.locator("h1")).to_contain_text("Welcome back")

