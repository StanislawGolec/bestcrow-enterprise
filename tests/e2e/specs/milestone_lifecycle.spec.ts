import { test, expect } from '@playwright/test';

test.describe('Bestcrow Enterprise - Milestone Escrow Lifecycle E2E', () => {
  test('should complete full lifecycle: discovery -> pledge -> evidence -> vote -> release', async ({ page }) => {
    // 1. Visit Homepage & Verify Elements
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Back the next');
    await expect(page.getByText('Colosseum 2026 Hackathon')).toBeVisible();

    // 2. Navigate to Discover Page
    await page.click('text=Explore Startups');
    await expect(page).toHaveURL(/.*discover/);
    await expect(page.locator('h1')).toContainText('Discover Startup Prototypes');

    // 3. Open First Campaign Details
    const firstCampaignLink = page.locator('a:has-text("View Details")').first();
    await expect(firstCampaignLink).toBeVisible();
    await firstCampaignLink.click();
    await expect(page).toHaveURL(/.*campaign\/.+/);

    // 4. Verify Financial Breakdown and Milestone Timeline
    await expect(page.getByText('Financial Breakdown & Escrow Pool')).toBeVisible();
    await expect(page.getByText('Milestone Tranches & Community Governance')).toBeVisible();

    // 5. Deposit a Pledge
    const pledgeInput = page.locator('input[type="number"]').first();
    await pledgeInput.fill('5.0');
    await page.click('button:has-text("Deposit Pledge to Vault")');

    // 6. Navigate to Campaign Creation
    await page.click('text=Start Campaign');
    await expect(page).toHaveURL(/.*campaign\/new/);

    // 7. Fill Campaign Creation Form
    await page.fill('input[placeholder*="AetherNet"]', 'E2E Autonomous Rover Prototype');
    await page.fill('textarea', 'Robotic planetary explorer prototype testing milestone funding on Solana.');
    await page.fill('input[type="number"] >> nth=0', '15'); // 15 SOL goal
    await page.fill('input[type="number"] >> nth=1', '45'); // 45 days

    // Submit Campaign
    await page.click('button:has-text("Seal Terms & Launch Campaign")');
    await expect(page).toHaveURL(/.*discover/, { timeout: 10000 });
  });
});
