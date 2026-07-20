# AI Booklet Designs

A daily collection of 3 booklet designs created with AI and published via GitHub Pages.

## 📋 Overview

This repository contains AI-generated booklet designs published daily. Each day features 3 unique designs in various styles and themes, perfect for sharing with ChatGPT or other AI tools for feedback and improvement.

## 🎨 Design Gallery

**Browse the latest designs:** [View Booklets](https://aleksvilly.github.io/ai-booklet-designs/)

## 📁 Repository Structure

```
ai-booklet-designs/
├── docs/                          # GitHub Pages source
│   ├── index.html                 # Main gallery page
│   ├── css/
│   │   └── style.css              # Beautiful styling
│   └── booklets/                  # Design folders by date
│       └── YYYY-MM-DD/
│           ├── booklet-1/
│           │   ├── design.png
│           │   └── metadata.json
│           ├── booklet-2/
│           └── booklet-3/
├── src/
│   └── generate.py                # AI design generation script
├── .github/
│   └── workflows/
│       └── daily-generate.yml     # Automation workflow
├── README.md
└── .gitignore
```

## 🤖 Daily Workflow

1. **Generate**: AI creates 3 unique booklet designs daily
2. **Organize**: Designs organized by date in `/docs/booklets/YYYY-MM-DD/`
3. **Publish**: Automatically published to GitHub Pages
4. **Share**: Easy sharing via public GitHub Pages URL or repo link

## 📅 Design Collection Format

### Folder Structure
```
docs/booklets/2026-07-20/
├── booklet-1/
│   ├── design.png (or .jpg)
│   └── metadata.json
├── booklet-2/
│   ├── design.png
│   └── metadata.json
└── booklet-3/
    ├── design.png
    └── metadata.json
```

### Metadata Template
```json
{
  "title": "Modern Minimalist Booklet",
  "description": "Clean, contemporary design with geometric elements",
  "created": "2026-07-20T09:00:00",
  "ai_model": "DALL-E 3",
  "prompt": "Modern booklet design with minimalist aesthetic",
  "tags": ["minimal", "modern", "professional"],
  "notes": "Consider adjusting color palette for print"
}
```

## 🚀 Getting Started

### 1. Enable GitHub Pages
✓ Already configured to use `docs` folder

Your gallery is live at: **https://aleksvilly.github.io/ai-booklet-designs/**

### 2. Add Your First Designs

Run the setup script:
```bash
python src/generate.py --dry-run
```

This creates the folder structure for today's designs.

### 3. Add Design Images

1. Place your AI-generated images in:
   ```
   docs/booklets/YYYY-MM-DD/booklet-N/design.png
   ```

2. Update `metadata.json` with design details

3. Commit and push:
   ```bash
   git add .
   git commit -m "Add daily booklet designs $(date +%Y-%m-%d)"
   git push
   ```

## 🤖 Automation with GitHub Actions

The included workflow (`daily-generate.yml`) can:
- Run daily at 9:00 AM UTC
- Integrate with your AI service (OpenAI, Midjourney, Stable Diffusion)
- Auto-commit and publish new designs
- Update the gallery automatically

To set it up:
1. Add your API keys to repository Secrets
2. Customize the workflow with your AI integration
3. Enable Actions in Settings

## 💡 Integration Ideas

### Share with ChatGPT
1. Export daily designs folder
2. Upload to ChatGPT with the repo README
3. Get feedback and improvement suggestions
4. Update designs based on feedback

### AI Service Integration
- **OpenAI/DALL-E**: Use API to generate images
- **Midjourney**: Manual generation → auto-upload
- **Stable Diffusion**: Local or API-based generation
- **Custom Scripts**: Add your own generation logic

### Social Media Sharing
Add scripts to automatically:
- Post to Twitter/X
- Share to LinkedIn
- Update Discord channel
- Notify followers

## 📊 Statistics

- **Daily Designs**: 3
- **Format**: High-resolution images + metadata
- **Organization**: Chronological (YYYY-MM-DD)
- **Sharing**: Public GitHub Pages + Repository

## 🔧 Customization

Edit `docs/css/style.css` to customize:
- Color scheme
- Gallery layout
- Typography
- Responsive breakpoints

Edit `docs/index.html` to:
- Add custom sections
- Change gallery behavior
- Add more metadata fields
- Integrate with other services

## 📝 Adding Designs Manually

For each new day:

```bash
# Create today's folder structure
python src/generate.py

# Add your images
cp /path/to/design1.png docs/booklets/2026-07-20/booklet-1/design.png

# Update metadata (edit JSON files)
nano docs/booklets/2026-07-20/booklet-1/metadata.json

# Commit and push
git add docs/booklets/
git commit -m "Add daily booklet designs 2026-07-20"
git push
```

## 🎯 Next Steps

1. ✅ Repository created
2. ⏭️ Add your first 3 designs to `/docs/booklets/YYYY-MM-DD/`
3. ⏭️ Update metadata.json files
4. ⏭️ Commit and push to see gallery update
5. ⏭️ Share public URL with ChatGPT or team

## 📄 License

Add your preferred license here (MIT, CC-BY-4.0, Proprietary, etc.)

---

**Created**: 2026-07-20  
**Status**: Ready for daily designs  
**Gallery**: [View Online](https://aleksvilly.github.io/ai-booklet-designs/)
