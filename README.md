# Maps Local Business Scraper

A desktop application for extracting business information from Google Maps using **Angular**, **NestJS**, and **Electron**.

## Features

- Search businesses by country, city, and category.
- Export search results.
- Desktop application for Windows.
- Open source.

---

# Download

If you only want to use the application, download the latest Windows release from the project's Releases page:

👉 https://github.com/Daniel1798-web/maps-local-business-scraper/releases

Download either the installer or the portable version and run the application.

---

# Running the Project from Source

## Requirements

- Node.js 22 or later
- npm

## 1. Clone the repository

```bash
git clone https://github.com/Daniel1798-web/maps-local-business-scraper.git

cd maps-local-business-scraper
```

## 2. Install dependencies

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd ../frontend
npm install
```

## 3. Build the backend

```bash
cd backend
npm run build
```

## 4. Start the backend

```bash
npm run start:prod
```

The API will be available at:

```
http://localhost:3000
```

## 5. Start the frontend

Open a new terminal and run:

```bash
cd frontend
npm start
```

The frontend will be available at:

```
http://localhost:4200
```

---

# Project Structure

```
maps-local-business-scraper/

backend/
├── src/
└── dist/

frontend/
├── src/
├── electron/
└── dist/
```

---

# Technologies

- Angular 21
- NestJS
- Electron
- Electron Builder
- TypeScript

---

# License

This project is licensed under the MIT License.
