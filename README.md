# A/B Test Visualization

An interactive Line Chart to visualize A/B test statistics, built with React, TypeScript, and Recharts.

## Features

- **Data Visualization**: Parses `data.json` to display daily conversion rates for multiple variations.
- **Interactive Chart**:
  - Hover tooltips showing exact conversion percentages.
  - Legend to toggle variations.
  - Responsive design that adapts to screen size.
- **Conversion Rate Calculation**: Automatically calculates rates based on `(conversions / visits) * 100`.

## Setup Instructions

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Locally**:
    ```bash
    npm run dev
    ```
    Open your browser to the URL shown in the terminal (usually `http://localhost:5173`).

## Deployment

To deploy to GitHub Pages:

1.  Ensure you have a remote repository set up.
2.  Run the deploy script:
    ```bash
    npm run deploy
    ```
    This will build the project and push the `dist` folder to the `gh-pages` branch.
