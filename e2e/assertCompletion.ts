import { expect, type Locator } from '@playwright/test';

export async function expectCompletion(card: Locator) {
  const buttons = card.getByRole('button');
  const first = buttons.first();
  await expect(first).toBeFocused();
  const hasNext = await first.textContent() === '다음 스테이지 →';
  await expect(buttons).toHaveText(hasNext ? ['다음 스테이지 →', '스테이지 고르기'] : ['스테이지 고르기']);
  await expect(card.locator('h1,h2,p:not(.clear-note),figcaption')).toHaveCount(0);
  await expect(card.locator('.star-row')).toBeVisible();
}
