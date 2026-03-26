# Competitor Social Scraper 🚀

A powerful, automated tool designed to extract social media profiles for lists of brands and competitors. It combines high-speed local scraping with an AI-powered fallback to ensure maximum accuracy across diverse website platforms.

## ✨ Features

- **Multi-Source Scraping**: Extracts links from HTML anchor tags and raw source code using optimized regex patterns.
- **E-commerce Platform Support**: Specialized logic for platforms like **Easy Orders (Egypt)**, fetching links directly from internal APIs that are often hidden from standard scrapers.
- **AI-Powered Fallback**: Integrates with the Anthropic API (via Web Search) to find social profiles if direct website scraping fails or is blocked.
- **Excel/CSV Integration**: Import competitor lists from `.xlsx` or `.csv` files and export cleaned results back to Excel.
- **Real-time Dashboard**: A React-based interface to monitor scraping progress, view logs, and manage results.
- **Auto-Correction**: Automatically handles URL normalization and cleans up malformed links.

## 🛠️ Prerequisites

- **Node.js**: Version 18.0 or higher.
- **Web Browser**: Chrome, Edge, or Firefox.

## 🚀 Quick Start

1. **Install Dependencies**:
   Open a terminal in the project directory and run:
   ```bash
   npm install
   ```

2. **Launch the Application**:
   Run the setup batch file (on Windows):
   ```bash
   ./start_app.bat
   ```
   *This will start the local backend server (Port 3000) and open the dashboard in your default browser.*

3. **Manual Run**:
   If you prefer to start the server manually:
   ```bash
   node server.mjs
   ```
   Then open `http://localhost:3000` in your browser.

## 📁 Project Structure

- `server.mjs`: The Node.js Express backend that performs the heavy-duty scraping.
- `index.html`: The frontend entry point (React App).
- `src/App.jsx`: Main application logic and state management.
- `src/agents/scraper.js`: Orchestrates the scraping flow (Direct Scrape -> AI Search).
- `src/components/`: Reusable UI components for the dashboard.
- `start_app.bat`: One-click startup script for Windows users.

## 🧠 Technical Overview

### Scraping Strategy
1. **Direct Local Scrape**: The backend uses `axios` and `cheerio` to fetch the website. It checks for specific platform signatures (like Easy Orders) to trigger specialized API-based extraction.
2. **AI Fallback**: If no links are found locally, the frontend triggers a call to the Anthropic API with `web_search` enabled to find official brand profiles across the web.

### Supported Platforms (Specialized)
- **Easy Orders**: Uses the `api.easy-orders.net` integration for Egyptian e-commerce sites.
- **General**: Detects Facebook, Instagram, TikTok, YouTube, Twitter (X), LinkedIn, Pinterest, Snapchat, and Threads.

## 📄 License

This tool is provided "as is" for professional research and competitive analysis. Please respect website `robots.txt` and terms of service when scraping.
