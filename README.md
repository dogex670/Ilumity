# Ilumity

A daily light from history. Each day opens with one inspiring quote from a cultural figure, then a swipeable feed (TikTok-style) of more quotes and surprising historical facts.

## Features
- **Today's light**: one quote per day, the same for everyone, cycling through every quote before repeating.
- **Swipe feed**: full-screen cards that snap one at a time, reshuffled daily and endless.
- **Tabs**: For you, Quotes, Facts, Saved.
- **Save**: tap the heart or double-tap a card. Saved items stay on your device.
- **Share**: uses your phone's share sheet, or copies the text.
- **Installable**: works offline and can be added to your home screen.

## Run it
No build step. Serve the folder with any static server:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

It also deploys as-is to GitHub Pages, Netlify or Vercel.

## Add content
Edit `data.js`. Quotes take `who`, `role`, `years`, `text` and `source`; facts take `title`, `text` and `when`. `era` (`ancient`, `medieval`, `early-modern`, `modern`) sets the card colour.

Many famous quotes online are misattributed, so each entry here names its source, and paraphrases or common translations are labelled.
