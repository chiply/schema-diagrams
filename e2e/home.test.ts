import { expect, test } from '@playwright/test';

test('home page has expected heading', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toBeVisible();
});
