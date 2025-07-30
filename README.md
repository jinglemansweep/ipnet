# IPNet - Ipswich Mesh Network

[![Deploy to GitHub Pages](https://github.com/jinglemansweep/ipnet-beta/actions/workflows/deploy.yml/badge.svg)](https://github.com/jinglemansweep/ipnet-beta/actions/workflows/deploy.yml)

Local MeshCore community group serving Ipswich, Suffolk, UK. Built with Eleventy (11ty) static site generator.

## Development

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Runs Eleventy with live reload at `http://localhost:8080`

### Build
```bash
# Local build (no path prefix)
npm run build

# Remote build (with path prefix)
PATH_PREFIX=/ipnet npm run build

# Clean build directory
npm run clean
```

## Deployment

### GitHub Pages
The site automatically deploys to GitHub Pages via GitHub Actions when pushing to the `main` branch.

**Deployed URL**: `https://www.ipnt.uk`

The GitHub Actions workflow:
1. Builds the site with `PATH_PREFIX=/ipnet`
2. Deploys to the `gh-pages` branch
3. Serves via GitHub Pages

### Path Prefix Support
The site supports customizable path prefixes for deployment on subdirectories:

- **Local development**: No prefix (`/`)
- **GitHub Pages**: `/ipnet` (or `/<repo-name>`)
- **Custom deployment**: Set `PATH_PREFIX` environment variable

#### How Path Prefixes Work
1. **Environment Variable**: Set `PATH_PREFIX=/your-path` during build
2. **11ty Filter**: Use `{{ '/path' | url }}` in templates for internal links
3. **Asset Paths**: All assets automatically get prefixed
4. **JavaScript**: API calls use the prefix from meta tag

#### Example Usage in Templates
```njk
<!-- Internal links -->
<a href="{{ '/' | url }}">Home</a>
<a href="{{ '/about/' | url }}">About</a>

<!-- Assets -->
<img src="{{ '/assets/images/logo.svg' | url }}" alt="Logo">
<script src="{{ '/assets/js/app.js' | url }}"></script>
```

### Configuration
- **Build Scripts**: Defined in `package.json`
- **11ty Config**: `.eleventy.js` with path prefix support
- **GitHub Actions**: `.github/workflows/deploy.yml`

## Project Structure
```
├── src/                    # 11ty source files
│   ├── _includes/         # Reusable templates (head, nav, footer, layout)
│   ├── _data/            # JSON data files
│   ├── index.njk         # Homepage
│   ├── contact.njk       # Contact page
│   ├── members.njk       # Members page
│   └── nodes.njk         # Network nodes page
├── assets/               # Static assets (CSS, JS, images, data)
├── _site/               # Generated site output
└── .github/workflows/   # GitHub Actions
```

## Features
- **Responsive Design**: Tailwind CSS with dark mode support
- **Interactive Elements**: Alpine.js for dynamic functionality
- **Reusable Components**: Header, navigation, footer templates
- **Data-Driven**: JSON files for nodes and members
- **Path Prefix Support**: Deploy anywhere with custom URLs
- **GitHub Pages Ready**: Automated deployment workflow

## Local Development vs Production
- **Local**: No path prefix, direct asset loading
- **GitHub Pages**: `/ipnet-beta` prefix, all links and assets prefixed
- **Custom Domain**: Configurable prefix for any deployment target
