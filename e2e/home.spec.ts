import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Home Page Flow', () => {
  test('home page loads correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Ürünü Tarat')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Kamera veya Galeri' })).toBeVisible();
  });

  test('error state for missing image', async ({ page }) => {
    await page.goto('/');
    const submitButton = page.locator('button', { hasText: 'Hemen Bul' });
    await expect(submitButton).toBeDisabled();
  });

  test('image upload with fixture and submit', async ({ page }) => {
    await page.goto('/');

    const dummyImagePath = path.join(__dirname, 'dummy.png');
    if (!fs.existsSync(dummyImagePath)) {
      const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      fs.writeFileSync(dummyImagePath, Buffer.from(base64, 'base64'));
    }

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(dummyImagePath);

    await page.fill('#dealBreaker', 'tekerlek bozulmasin');
    
    // Intercept to avoid using real API keys or scraping
    await page.route('/api/analyze', async route => {
      // Simulate delay for realism
      await new Promise(resolve => setTimeout(resolve, 2000));
      const json = {
        matchPercent: 95,
        decisionTitle: "Güvenle Alabilirsiniz",
        decisionSummary: "Kriterlerinize uygun.",
        pros: ["İyi kalite"],
        cons: [],
        dealBreaker: {
          condition: "tekerlek bozulmasin",
          verdict: "pass",
          confidence: 90,
          evidence: ["Tekerlekleri sağlam yorumları var."],
          shortExplanation: "Tekerlekler sağlam."
        },
        evidenceLimitations: [],
        bestListing: {
          source: "fixture",
          title: "Test Ürün",
          priceTRY: 100,
          url: "https://example.com"
        }
      };
      await route.fulfill({ json });
    });

    const submitButton = page.locator('button', { hasText: 'Hemen Bul' });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Result should appear
    await expect(page.locator('text=Güvenle Alabilirsiniz')).toBeVisible();
    await expect(page.locator('text=Tekerlekler sağlam.')).toBeVisible();
  });
});
