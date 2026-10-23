import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

describe('HomePage', () => {
  it('renders the product name as the main heading', () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toMatch(/<h1[^>]*>Turnero<\/h1>/);
  });
});
