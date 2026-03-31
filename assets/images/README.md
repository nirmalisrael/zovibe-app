# Zovibe image assets

## In-app splash logo (required for animated splash)

| File | Path | Purpose |
|------|------|--------|
| **Logo mark** | `assets/images/zovibe-logo.png` | Shown on `SplashScreen` with animation. **Transparent PNG** recommended. |

**Replace** the placeholder `zovibe-logo.png` with your Nano Banano / Gemini export. Ideal specs:

- **Size:** 512×512 px or 1024×1024 px (square)
- **Format:** PNG with **alpha** (transparent background)
- **Content:** Mark only (no app name text), centered, safe padding ~10% inside the canvas so scaling looks clean

---

## App icon & native splash (Expo)

Configured in `app.json`:

| File | Path | Purpose |
|------|------|--------|
| App icon | `assets/icon.png` | Launcher icon. **1024×1024** PNG, no transparency (Expo will round on iOS). |
| Native splash | `assets/splash.png` | Shown **before** JS loads. Often full-bleed or centered logo on brand color `#0D0D1A`. |

After changing these, run `npx expo prebuild` again if you use native projects, or rely on EAS Build to pick them up.

---

## Gemini / Nano Banano — logo prompt (copy-paste)

Use this for the **in-app mark** (`zovibe-logo.png`) and optionally adapt for icon/splash.

```
App logo mark for "Zovibe", a modern music streaming mobile app focused on Indian music (Tamil, Hindi, English).

Style: minimal, premium, similar energy to Spotify or JioSaavn — clean geometry, not cluttered. Abstract symbol suggesting sound, rhythm, or play/vibe (waves, equalizer bars, or a stylized Z merged with a play or sound motif). Single cohesive icon, no text letters spelling the name.

Colors: primary purple #7C3AED, accents lavender #A78BFA and soft glow #C4B5FD; optional subtle cyan #06B6D4 or pink #EC4899 as tiny highlights only.

Background: fully transparent (alpha). High resolution, crisp edges, flat or very subtle depth — no heavy 3D, no photo textures.

Output: square canvas, centered icon with comfortable padding, suitable as a 1024x1024 PNG with transparency for mobile UI.
```

**For `icon.png` (no transparency):** add: *"Solid circular or rounded-square background #0D0D1A or deep purple #1A1035 behind the mark; no transparency."*

**For `splash.png`:** add: *"Dark background #0D0D1A full bleed; logo centered with generous margin; minimal, calm composition."*

---

## Checklist

1. Generate logo → export **transparent PNG** → save as `assets/images/zovibe-logo.png` (overwrite placeholder).
2. (Optional) Export **1024×1024** app icon → `assets/icon.png`.
3. (Optional) Export splash art → `assets/splash.png`.
4. Reload the app: in-app splash uses `SplashScreen`; cold start still shows native `splash` briefly first.
