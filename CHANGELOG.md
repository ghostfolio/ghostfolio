# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.99.0 - 03.05.2021

### Added

- Added support for deleting users in the admin control panel

### Changed

- Eliminated the platform attribute from the transaction model

## 0.98.0 - 02.05.2021

### Added

- Added the logic to create and update accounts

## 0.97.0 - 01.05.2021

### Added

- Added an account page as a preparation for the multi accounts support

## 0.96.0 - 30.04.2021

### Added

- Added the absolute change to the position detail dialog
- Added the number of transactions to the position detail dialog

### Changed

- Harmonized the slogan to "Open Source Portfolio Tracker"

## 0.95.0 - 28.04.2021

### Added

- Added a data source attribute to the transactions model

## 0.94.0 - 27.04.2021

### Added

- Added the generic scraper symbols to the symbol lookup results

## 0.93.0 - 26.04.2021

### Changed

- Improved the user table styling of the admin control panel
- Improved the background colors in the dark mode

## 0.92.0 - 25.04.2021

### Added

- Prepared further for multi accounts support: store account for new transactions
- Added a horizontal scrollbar to the user table of the admin control panel

### Fixed

- Fixed an issue in the header with outdated data
- Fixed an issue on the about page with outdated data

## 0.91.0 - 25.04.2021

### Added

- Extended the support for feature flags to simplify the initial project setup
- Prepared for multi accounts support

### Changed

- Improved the styling of the rules in the _X-ray_ section

## 0.90.0 - 22.04.2021

### Added

- Added the symbol logo to the position detail dialog
- Introduced a third option for the market state: `delayed` (besides `open` and `closed`)

### Changed

- Improved the user table of the admin control panel

## 0.89.0 - 21.04.2021

### Added

- Added a prettifier (pipe) for generic scraper symbols

### Fixed

- Fixed the text truncation in buttons of the admin control panel

## 0.88.0 - 20.04.2021

### Changed

- Reverted the restoring of the scroll position when opening a new page

### Fixed

- Fixed the frozen screen if the token has expired
- Fixed some issues in the generic scraper

## 0.87.0 - 19.04.2021

### Added

- Added a generic scraper

### Fixed

- Fixed an issue in the user table of the admin control panel with missing data

## 0.86.1 - 18.04.2021

### Added

- Added the license to the about page
- Added a validation for environment variables
- Added support for feature flags to simplify the initial project setup

### Changed

- Changed the about page for the new license
- Optimized the data management for historical data
- Optimized the exchange rate service
- Improved the user table of the admin control panel

### Fixed

- Restored the scroll position when opening a new page

## 0.85.0 - 16.04.2021

### Changed

- Refactored many frontend components
- Changed the routing to `routerLink` for an improved navigation experience
- Simplified the initial project setup

## 0.84.0 - 11.04.2021

### Fixed

- Fixed static portfolio analysis rules (_Currency Cluster Risk_) if no positions in base currency
  - Initial Investment: Base Currency
  - Current Investment: Base Currency

## 0.83.0 - 11.04.2021

### Added

- Added a new static portfolio analysis rule: Fees in relation to the initial investment

### Changed

- Reset the cache on the server start

### Fixed

- Fixed an issue in the portfolio update on deleting a transaction
- Fixed an issue in the _X-ray_ section (missing redirection on logout)

## 0.82.0 - 10.04.2021

### Added

- Added a gradient to the line charts
- Added a selector to set the base currency on the account page

## 0.81.0 - 06.04.2021

### Added

- Added support for assets in `GBP`
- Added an error handling with messages in the client

### Changed

- Changed the _Ghostfolio_ SaaS (cloud) from a `nano` to a `micro` instance for a better performance

## 0.80.0 - 05.04.2021

### Changed

- Improved the spacing in the header
- Upgraded `chart.js` from version `2.9.4` to `3.0.2`

## 0.79.0 - 04.04.2021

### Changed

- Refactored the data management services
- Upgraded `bootstrap` from version `4.5.3` to `4.6.0`
- Upgraded `date-fns` from version `2.16.1` to `2.19.0`
- Upgraded `ionicons` from version `5.4.0` to `5.5.1`
- Upgraded `lodash` from version `4.17.20` to `4.17.21`
- Upgraded `ngx-markdown` from version `11.1.0` to `11.1.2`
- Upgraded `ngx-skeleton-loader` from version `2.6.2` to `2.9.1`
- Upgraded `prisma` from version `2.18.0` to `2.20.1`

## 0.78.0 - 04.04.2021

### Added

- Added a spinner to the create or edit transaction dialog
- Added support for the back button in
  - portfolio performance chart dialog
  - position detail dialog
  - create transaction dialog
  - edit transaction dialog

### Changed

- Improved the single platform rule by adding the number of platforms

## 0.77.1 - 03.04.2021

### Changed

- Minor improvements

## 0.77.0 - 03.04.2021

### Added

- Added support for base currency in user settings
- Added an investment risk disclaimer to the footer
- Added two more static portfolio analysis rules:
  - _Currency Cluster Risk_ (current investment)
  - _Platform Cluster Risk_ (current investment)

### Changed

- Grouped the _X-ray_ section visually in _Currency Cluster Risk_ and _Platform Cluster Risk_

## 0.76.0 - 02.04.2021

### Added

- Added two more static portfolio analysis rules:
  - _Currency Cluster Risk_ (base currency)
  - _Platform Cluster Risk_ (single platform)

### Fixed

- Fixed an issue in the _X-ray_ section (empty portfolio)

## 0.75.0 - 01.04.2021

### Fixed

- Fixed an issue in the exchange rate service occurring on the first day of the month

## 0.74.0 - 01.04.2021

### Added

- Added a _Create Account_ message in the _Live Demo_
- Added skeleton loaders to the _X-ray_ section

### Changed

- Improved the alignment of the _Why Ghostfolio?_ section
- Improved the styling of the _Fear & Greed Index_ (market mood)

## 0.73.0 - 31.03.2021

### Added

- Added the _Fear & Greed Index_ (market mood) to the portfolio performance chart dialog
- Added a link to the info box on the analysis page

### Changed

- Improved the intro text in the _X-ray_ section

### Fixed

- Fixed the flickering of the _Sign in_ button in the header

## 0.72.1 - 30.03.2021

### Fixed

- Fixed an issue with updating or resetting the platform of a transaction

## 0.72.0 - 30.03.2021

### Added

- Added an intro text to the _X-ray_ section

### Changed

- Improved the editing of transactions
- Harmonized the page titles

### Fixed

- Fixed an issue with wrong transaction dates

## 0.71.0 - 28.03.2021

### Added

- Added the second static portfolio analysis rule: _Platform Cluster Risk_

### Changed

- Improved the styling in the _X-ray_ section

## 0.70.0 - 27.03.2021

### Added

- Added the current _Fear & Greed Index_ as text
- Extended the landing page text: _Ghostfolio_ empowers busy folks...
- Added the first static portfolio analysis rule in the brand new _X-ray_ section

### Changed

- Improved the spacing in the footer

## 0.69.0 - 27.03.2021

### Added

- Added the current _Fear & Greed Index_ to the resources page

## 0.68.0 - 26.03.2021

### Changed

- Improved the performance of the position detail dialog

### Fixed

- Fixed a scroll issue in dialogs

## 0.67.0 - 26.03.2021

### Added

- Added an experimental API to get historical data for benchmarks

## 0.66.0 - 25.03.2021

### Added

- Added a chevron to the position
- Added an experimental API to get benchmark data

## 0.65.0 - 24.03.2021

### Added

- Added a legend to the portfolio performance chart
- Added a placeholder to the filter of the transactions table

### Changed

- Changed the regular data management check to a smarter approach

## 0.64.0 - 23.03.2021

### Added

- Added an index to the market data database table

### Changed

- Optimized the other dialogs for mobile (full screen and close button)

## 0.63.0 - 22.03.2021

### Changed

- Improved the transactions table
- Optimized the position detail dialog for mobile (full screen and close button)

## 0.62.0 - 21.03.2021

### Fixed

- Fixed an issue while loading data concurrently via the date range component

## 0.61.0 - 21.03.2021

### Fixed

- Fixed an issue in the performance calculation if there are only transactions from today

## 0.60.0 - 20.03.2021

### Added

- Added a button to create the first transaction on the analysis page

### Fixed

- Fixed an issue on the analysis page if there are only transactions from today

## 0.59.0 - 20.03.2021

### Added

- Extended the landing page text: Why _Ghostfolio_?
- Extended the glossary of the resources page

## 0.58.0 - 20.03.2021

### Added

- Added meta data for _Open Graph_ and _Twitter Cards_
- Added meta data: `description` and `keywords`

### Changed

- Improved the icon

### Fixed

- Fixed the `sitemap.xml` file

## 0.57.0 - 19.03.2021

### Added

- Added the `sitemap.xml` file
- Added a resources page
- Added a chart to the landing page

### Changed

- Improved the performance chart
- Improved the average buy price in the position detail chart
- Improved the style of the active page in the navigation on mobile

## 0.56.0 - 18.03.2021

### Added

- Added the quantity and investment in the position detail dialog

### Changed

- Improved the performance chart
- Improved the performance calculation
- Improved the average buy price in the position detail chart

## 0.55.0 - 16.03.2021

### Changed

- Improved the performance calculation

## 0.54.0 - 15.03.2021

### Added

- Added another _Create Account_ button at the end of the landing page

### Fixed

- Fixed an issue in the position detail chart if the position has been bought today (no historical data)
- Fixed an issue in the transaction service with unordered items

## 0.53.0 - 14.03.2021

### Added

- Set up database backup

### Changed

- Improved `site.webmanifest`

## 0.52.0 - 14.03.2021

### Changed

- Added the membership status to the account page

### Fixed

- Fixed an issue in the chart (empty portfolio)

## 0.51.0 - 14.03.2021

### Changed

- Changed the default number of rows from 10 to 7 in the positions table

## 0.50.1 - 13.03.2021

### Fixed

- Fixed the button to expand rows in the positions table

## 0.50.0 - 13.03.2021

### Added

- Added filters to switch between _Original Shares_ vs. _Current Shares_ in pie charts
- Added a button to expand rows in the positions table

### Changed

- Ordered platforms by name in edit transaction dialog
- Modularized the date range component

### Fixed

- Fixed the error handling for the data management (errors in nested data)

## 0.49.0 - 13.03.2021

### Added

- Added additional portfolio filters for `1Y` and `5Y`
- Added an error handling for the data management

### Changed

- Improved the pricing section

## 0.48.1 - 11.03.2021

### Fixed

- Fixed the about page for unauthorized users

## 0.48.0 - 11.03.2021

### Added

- Added a pricing section

### Changed

- Improved the positions and transactions table
  - Harmonized alignment
  - Enabled position detail dialog

## 0.47.0 - 10.03.2021

### Added

- Added a positions table with information about _Original Shares_ vs. _Current Shares_
- Added data management to control panel

## 0.46.0 - 09.03.2021

### Added

- Added permission based access-control
- Added an admin control panel

## 0.45.0 - 08.03.2021

### Changed

- Changed the data management of benchmarks with extended persistency
- Changed the data management of currencies with extended persistency

## 0.44.0 - 07.03.2021

### Changed

- Changed the data management with extended persistency
- Upgraded `prisma` from version `2.16.1` to `2.18.0`
- Upgraded `angular` from version `11.0.9` to `11.2.4`

## 0.43.0 - 04.03.2021

### Fixed

- Fixed missing columns (_Quantity_, _Unit Price_ and _Fee_) in transactions table
- Fixed displaying edit transaction dialog in impersonation mode
- Fixed `/.well-known/assetlinks.json` for TWA

## 0.42.0 - 03.03.2021

### Changed

- Improved the skeleton loader (minor)

### Fixed

- Fixed the portfolio unit tests

## 0.41.0 - 02.03.2021

### Added

- Added the possibility to create or edit a transaction with a platform

### Changed

- Increased the token expiration duration

### Fixed

- Only show relevant data in the position detail dialog
- Improved the performance chart styling in Safari

## 0.40.0 - 01.03.2021

### Fixed

- Fixed the calculation issues occurring on the first day of each month
- Harmonized the percent value formatting

## 0.39.0 - 28.02.2021

### Changed

- Improved the buy price in the position detail dialog

### Fixed

- Fixed the (hidden) header issue

## 0.38.0 - 26.02.2021

### Added

- Added `/.well-known/assetlinks.json` for TWA

## 0.37.0 - 25.02.2021

### Added

- Added a benchmark (_S&P 500_) to the portfolio performance chart

## 0.36.1 - 24.02.2021

### Changed

- Minor improvements in the transactions table

## 0.36.0 - 24.02.2021

### Added

- Added the possibility to edit a transaction

## 0.35.0 - 23.02.2021

### Changed

- Added transparent background to header
- Harmonized currency value formatting

### Fixed

- Fixed header issue with (not) signed in

## 0.34.0 - 21.02.2021

### Changed

- Improved skeleton loader of position
- Simplified sign in / sign up flow

## 0.33.0 - 21.02.2021

### Added

- Added favicon and `site.webmanifest`

### Changed

- Set font style of numbers to tabular
- Rename _Orders_ to _Transactions_

### Security

- Additionally hash the _Security Token_ (no more stored in plain text)

## 0.32.0 - 20.02.2021

### Added

- Added a landing page text: How does _Ghostfolio_ work?
- Added the _Independent & Bootstrapped_ badge to the about page

## 0.31.0 - 20.02.2021

### Added

- Added a changelog to the about page
- Added a twitter account to the about page
- Added the version to the about page

## 0.30.0 - 19.02.2021

### Added

- Added an about page

## 0.29.0 - 19.02.2021

### Added

- Added a landing page text: Why _Ghostfolio_?

## 0.28.2 - 17.02.2021

### Added

- Added caching for the portfolio (Redis)
