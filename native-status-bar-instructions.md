## Task: Make the PWA feel native on iOS and Android by integrating the status bar and safe areas

Make the following changes to the app:

1. **Update the viewport meta tag** in `index.html` to add `viewport-fit=cover`:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   ```

2. **Change the iOS status bar style** meta tag in `index.html` from `default` to `black-translucent`:
   ```html
   <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
   ```

3. **Add a sticky app header** that extends behind the status bar using the app's theme color (`#5a4a3a`). The header must use `padding-top: env(safe-area-inset-top)` so content sits below the status bar while the background color fills the status bar area — creating a native navigation bar effect.

4. **Add bottom safe area padding** to the body or any fixed bottom bar using `padding-bottom: env(safe-area-inset-bottom)` to prevent content from being hidden behind the iPhone home indicator.

5. **Do not change the existing `theme-color` meta tag** — it already handles Android's status bar coloring correctly.

The goal is that when the PWA is installed and opened in standalone mode, the system status bar (clock, battery, signal icons) floats on top of the app's colored header, looking identical to a native app — not showing a separate white or black system bar.
