A Python-based RESTful service for tracking and visualising countries you’ve visited. Built with Flask and Flask-RESTX, it integrates an SQLite database and external GraphQL/CSV data sources for enriched country metadata.

---

## Overview

The **myTravelHistory API** allows clients to:

- **Record Visits**: Add or update country records by ISO code, capturing years visited.
- **Query Records**: Retrieve detailed country data enriched from a GraphQL API.
- **List & Filter**: Browse all stored countries with advanced filtering (continent, currency, language, year), sorting, and pagination.
- **Visualise Data**: Generate a PNG with pie charts showing visits by country, continent, and year.

The service stores data in a local SQLite database (`countries_visited.db`), leveraging JSON fields for flexible storage of languages, currencies, and visit years. Auditing is implicit via `last_updated` timestamps.

---

## Functionality

### 1. Initialise Database

On startup, the API ensures the `countries` table exists with columns:

- `code`, `name`, `native`, `flag`, `capital`, `continent`
- `languages`, `currencies`, `years_visited` as JSON strings
- `last_updated` timestamp

### 2. Country Resource (`/countries/<code>`)

- **PUT**: Fetch metadata from the external GraphQL API (`countries.trevorblades.com`) and upsert a record. Optionally accepts a JSON body with `years_visited` (list of years). Returns full country data with HATEOAS links (`self`, `prev`, `next`).

- **GET**: Retrieve an existing record by ISO code. Returns stored JSON fields and navigation links.

- **PATCH**: Update only `years_visited` for a country, merging with existing years and updating `last_updated`.

- **DELETE**: Remove a country record.

### 3. Country List (`/countries`)

Supports query parameters:

- `continent` (2‑letter code) → filters by continent name
- `currency` (3‑letter code)
- `language` (2‑letter code)
- `year` (integer)
- `sort` (e.g. `code`, `-last_updated`)
- `page`, `size` (pagination)

Returns a paginated list with metadata (`page`, `size`, `total_pages`, `total_countries`) and HATEOAS links.

### 4. Visualisation (`/countries/visited`)

- **GET**: Generates a PNG image containing three pie charts:
  1. Visits by Country (with years listed)
  2. Visits by Continent
  3. Visits by Year

Returns `204 No Content` if no data; otherwise `200 OK` with image payload.

---

## Features

- **Flask-RESTX**: organised namespaces, models, and automatic Swagger UI (`/`)
- **External Data Enrichment**: GraphQL for country metadata; optional CSV for continent codes if needed
- **JSON Storage in SQLite**: flexible storage of nested arrays (languages, currencies, years)
- **Filtering & Sorting**: SQL `EXISTS(json_each…)` queries and in-memory stable sorts
- **Pagination**: prevents overloading clients and supports HATEOAS navigation
- **Data Visualisation**: Matplotlib–generated pie charts streamed as PNG
- **Error Handling**: consistent HTTP status codes (400, 404, 504)

---

## Tech Stack

- **Language**: Python 3
- **Web Framework**: Flask, Flask-RESTX
- **Database**: SQLite (`sqlite3` module)
- **HTTP Client**: `requests` for GraphQL queries
- **Visualisation**: Matplotlib (Agg backend)
- **Data**: External GraphQL endpoint (countries.trevorblades.com)

---

## Getting Started

1. **Clone & Set up**:
   ```bash
   git clone https://github.com/rogertruong7/countries_visited_api.git
   cd countries_visited_api
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt