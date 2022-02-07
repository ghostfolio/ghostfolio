# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.112.1 - 06.02.2022

### Fixed

- Fixed the creation of the user account (missing access token)

## 1.112.0 - 06.02.2022

### Added

- Added the export functionality to the position detail dialog

### Changed

- Improved the export functionality for activities (respect filtering)
- Removed the _Admin_ user from the database seeding
- Assigned the role `ADMIN` on sign up (only if there is no admin yet)
- Upgraded `prisma` from version `3.8.1` to `3.9.1`

### Fixed

- Fixed an issue with the performance calculation in connection with a sell activity in the new calculation engine
- Fixed the horizontal overflow in the accounts table
- Fixed the horizontal overflow in the activities table
- Fixed the total value of the activities table in the position detail dialog (absolute value)

### Todo

- Apply data migration (`yarn database:migrate`)

## 1.111.0 - 03.02.2022

### Added

- Added support for deleting symbol profile data in the admin control panel

### Changed

- Used `dataSource` and `symbol` from `SymbolProfile` instead of the `order` object (in `ExportService` and `PortfolioService`)

### Fixed

- Fixed the symbol selection of the 7d data gathering

## 1.110.0 - 02.02.2022

### Fixed

- Fixed the data source of the _Fear & Greed Index_ (market mood)

### Todo

- Apply data migration (`yarn database:migrate`)

## 1.109.0 - 01.02.2022

### Added

- Added support for the (optional) `accountId` in the import functionality for activities
- Added support for the (optional) `dataSource` in the import functionality for activities
- Added support for the data source transformation
- Added support for the cryptocurrency _Mina Protocol_ (`MINA-USD`)

### Changed

- Improved the usability of the form in the create or edit transaction dialog
- Improved the consistent use of `symbol` in combination with `dataSource`
- Removed the primary data source from the client

### Removed

- Removed the unused endpoint `GET api/order/:id`

## 1.108.0 - 27.01.2022

### Changed

- Improved the annualized performance in the new calculation engine
- Increased the historical data chart of the _Fear & Greed Index_ (market mood) to 90 days

## 1.107.0 - 24.01.2022

### Added

- Added a new calculation engine (experimental)

### Fixed

- Fixed the styling in the footer row of the activities table

## 1.106.0 - 23.01.2022

### Added

- Added the footer row with total fees and total value to the activities table

### Changed

- Extended the historical data view in the admin control panel
- Upgraded _Stripe_ dependencies
- Upgraded `prisma` from version `3.7.0` to `3.8.1`

### Fixed

- Improved the redirection on logout

## 1.105.0 - 20.01.2022

### Added

- Added support for fetching multiple symbols in the `GOOGLE_SHEETS` data provider

### Changed

- Improved the data provider with grouping by data source and thereby reducing the number of requests

### Fixed

- Fixed the unresolved account names in the _X-ray_ section
- Fixed the date conversion in the `GOOGLE_SHEETS` data provider

## 1.104.0 - 16.01.2022

### Fixed

- Fixed the fallback to load currencies directly from the data provider
- Fixed the missing symbol profile data connection in the import functionality for activities

## 1.103.0 - 13.01.2022

### Changed

- Added links to the statistics section on the about page

### Fixed

- Fixed the currency of the value in the position detail dialog

## 1.102.0 - 11.01.2022

### Changed

- Start eliminating `dataSource` from activity

### Fixed

- Fixed the support for multiple accounts with the same name
- Fixed the preselected default account of the create activity dialog

## 1.101.0 - 08.01.2022

### Added

- Added `GOOGLE_SHEETS` as a new data source type

### Changed

- Excluded the url pattern of shared portfolios in the `robots.txt` file

### Todo

- Apply data migration (`yarn database:migrate`)

## 1.100.0 - 05.01.2022

### Added

- Added the _Top 3_ and _Bottom 3_ performers to the analysis page
- Added a blog post

### Fixed

- Fixed the routing of the create activity dialog
- Fixed the link color in the blog posts

## 1.99.0 - 01.01.2022

### Added

- Exposed the profile data gathering by symbol as an endpoint

### Changed

- Improved the portfolio analysis page: show the y-axis and extend the chart in relation to the days in market
- Restructured the about page
- Start refactoring _transactions_ to _activities_
- Refactored the demo user id
- Upgraded `angular` from version `13.0.2` to `13.1.1`
- Upgraded `chart.js` from version `3.5.0` to `3.7.0`
- Upgraded `Nx` from version `13.3.0` to `13.4.1`

### Fixed

- Hid the data provider warning while loading
- Fixed an exception with the market state caused by a failed data provider request
- Fixed an exception in the portfolio position endpoint
- Fixed the reload of the position detail dialog (with query parameters)
- Fixed the missing mapping for Russia in the data enhancer for symbol profile data via _Trackinsight_

## 1.98.0 - 29.12.2021

### Added

- Added the date range component to the holdings tab

### Changed

- Extended the statistics section on the about page (users in Slack community)

### Fixed

- Fixed the creation of historical data in the admin control panel (upsert instead of update)
- Fixed the scrolling issue in the position detail dialog on mobile

## 1.97.0 - 28.12.2021

### Added

- Added the transactions to the position detail dialog
- Added support for dividend

### Todo

- Apply data migration (`yarn database:migrate`)

## 1.96.0 - 27.12.2021

### Changed

- Made the data provider warning more discreet
- Upgraded `http-status-codes` from version `2.1.4` to `2.2.0`
- Upgraded `ngx-device-detector` from version `2.1.1` to `3.0.0`
- Upgraded `ngx-markdown` from version `12.0.1` to `13.0.0`
- Upgraded `ngx-stripe` from version `12.0.2` to `13.0.0`
- Upgraded `prisma` from version `3.6.0` to `3.7.0`

### Fixed

- Fixed the file type detection in the import functionality for transactions

## 1.95.0 - 26.12.2021

### Added

- Added a warning to the log if the data gathering fails

### Fixed

- Filtered potential `null` currencies
- Improved the 7d data gathering optimization for currencies

## 1.94.0 - 25.12.2021

### Added

- Added support for cryptocurrencies _Cosmos_ (`ATOM-USD`) and _Polkadot_ (`DOT-USD`)

### Changed

- Increased the historical data chart of the _Fear & Greed Index_ (market mood) to 30 days
- Made the import functionality for transactions by `csv` files more flexible
- Optimized the 7d data gathering (only consider symbols with incomplete market data)
- Upgraded `prettier` from version `2.3.2` to `2.5.1`

## 1.93.0 - 21.12.2021

### Added

- Added support for the cryptocurrency _Solana_ (`SOL-USD`)
- Extended the documentation for self-hosting with the [official Ghostfolio Docker image](https://hub.docker.com/r/ghostfolio/ghostfolio)

### Fixed

- Converted errors to warnings in portfolio calculator

## 1.92.0 - 19.12.2021

### Added

- Added a line chart to the historical data view in the admin control panel
- Supported the update of historical data in the admin control panel

### Fixed

- Improved the redirection on logout
- Fixed the permission for the system status page

## 1.91.0 - 18.12.2021

### Changed

- Removed the redundant all time high and all time low from the performance endpoint

### Fixed

- Fixed the symbol conversion from _Yahoo Finance_ including a hyphen
- Fixed hidden values (`0`) in the statistics section on the about page

### Todo

- Apply data migration (`yarn database:migrate`)

## 1.90.0 - 14.12.2021

### Added

- Extended the validation in the import functionality for transactions by checking the currency of the data provider service
- Added support for cryptocurrency _Uniswap_
- Set up pipeline for docker build

### Changed

- Removed the default transactions import limit
- Improved the landing page in dark mode

### Fixed

- Fixed `/bin/sh: prisma: not found` in docker build
- Added `apk` in `Dockerfile` (`python3 g++ make openssl`)

## 1.89.0 - 11.12.2021

### Added

- Extended the data gathering by symbol endpoint with an optional date

### Changed

- Upgraded `Nx` from version `13.2.2` to `13.3.0`
- Upgraded `storybook` from version `6.4.0-rc.3` to `6.4.9`

## 1.88.0 - 09.12.2021

### Added

- Added a coupon system

## 1.87.0 - 07.12.2021

### Added

- Supported the management of additional currencies in the admin control panel
- Introduced the system message
- Introduced the read only mode

### Changed

- Increased the historical data chart of the _Fear & Greed Index_ (market mood) to 10 days
- Upgraded `prisma` from version `2.30.2` to `3.6.0`

## 1.86.0 - 04.12.2021

### Added

- Added the historical data chart of the _Fear & Greed Index_ (market mood)

### Changed

- Improved the historical data view in the admin control panel (hide invalid and future dates)
- Enabled the import functionality for transactions by default
- Converted the symbols to uppercase to avoid case-sensitive duplicates in the symbol profile model

### Fixed

- Improved the allocations by currency in combination with cash balances

## 1.85.0 - 01.12.2021

### Fixed

- Fixed the data gathering of the _Fear & Greed Index_ (market mood)

## 1.84.0 - 30.11.2021

### Added

- Exposed the data gathering by symbol as an endpoint

## 1.83.0 - 29.11.2021

### Changed

- Removed the experimental API

### Fixed

- Eliminated the redundant storage of historical exchange rates

## 1.82.0 - 28.11.2021

### Added

- Added tabs with routing to the admin control panel
- Added a new tab to manage historical data to the admin control panel

### Changed

- Introduced tabs with routing to the home page

## 1.81.0 - 27.11.2021

### Added

- Added the value to the position detail dialog

### Changed

- Upgraded `angular` from version `12.2.4` to `13.0.2`
- Upgraded `angular-material-css-vars` from version `2.1.2` to `3.0.0`
- Upgraded `nestjs` from version `7.6.18` to `8.2.3`
- Upgraded `Nx` from version `12.8.0` to `13.2.2`
- Upgraded `rxjs` from version `6.6.7` to `7.4.0`
- Upgraded `storybook` from version `6.3.8` to `6.4.0-rc.3`

### Fixed

- Fixed the broken line charts showing value labels if openend from the allocations page
- Fixed the click event for drafts in the transactions table

## 1.80.0 - 23.11.2021

### Added

- Accentuated the all time high and the all time low

## 1.79.0 - 21.11.2021

### Added

- Added the value column to the positions table
- Added support for cryptocurrency _Algorand_

### Changed

- Locked the symbol input in the edit transaction dialog
- Filtered the account selector by account type (`SECURITIES`) in the create or edit transaction dialog

### Fixed

- Fixed the search functionality for cryptocurrency symbols (do not show unsupported symbols)

## 1.78.0 - 20.11.2021

### Added

- Added a testimonial section to the landing page

### Fixed

- Fixed the footer row border of the accounts table in dark mode

## 1.77.0 - 16.11.2021

### Changed

- Hid the _Get Started_ button on the registration page

### Fixed

- Fixed the footer row of the accounts table on mobile
- Fixed the transactions count calculation in the accounts table (exclude drafts)

## 1.76.0 - 14.11.2021

### Added

- Added the footer row with buying power and net worth to the accounts table

## 1.75.0 - 13.11.2021

### Added

- Added a logo to the log on the server start
- Added the data gathering progress to the log and the admin control panel
- Added the value column to the accounts table

## 1.74.0 - 11.11.2021

### Changed

- Adapted the decimal places for cryptocurrencies in the position detail dialog
- Moved the _Fear & Greed Index_ (market mood) to a new tab on the home page

## 1.73.0 - 10.11.2021

### Changed

- Improved the info messages to add the first transaction

### Fixed

- Fixed the skeleton loader of the portfolio holdings

## 1.72.0 - 08.11.2021

### Changed

- Cached the statistics section on the about page

## 1.71.0 - 07.11.2021

### Changed

- Changed the logger from `console.log()` to `Logger.log()`

### Fixed

- Fixed an exception in the scraper configuration

## 1.70.0 - 07.11.2021

### Changed

- Improved the validation of `json` files in the import functionality for transactions
- Moved the scraper configuration to the symbol profile model

### Todo

- Apply data migration (`yarn database:migrate`)

## 1.69.0 - 07.11.2021

### Added

- Added the symbol mapping attribute to the symbol profile model

### Changed

- Improved the registration page

### Todo

- Apply data migration (`yarn database:migrate`)

## 1.68.0 - 01.11.2021

### Changed

- Prettified the generic scraper symbols in the portfolio proportion chart component
- Extended the statistics section on the about page by the active users count (7d)
- Extended the statistics section on the about page by the new users count

## 1.67.0 - 31.10.2021

### Added

- Added more details to the public page (currencies, sectors, continents and regions)
- Added a `Dockerfile` and documentation to build a _Docker_ image

## 1.66.0 - 30.10.2021

### Changed

- Improved the landing page
- Ordered the granted accesses by type

## 1.65.0 - 25.10.2021

### Added

- Added the user interface for granting and revoking public access to share the portfolio

### Changed

- Moved the data enhancer calls from the data provider (`get()`) to the data gathering service to reduce traffic to 3rd party data providers
- Changed the profile data gathering from every 12 hours to once every weekend

## 1.64.0 - 21.10.2021

### Added

- Added support for more cryptocurrency symbols like _Avalanche_, _Polygon_, _Shiba Inu_ etc.

### Changed

- Changed the data provider service to handle a dynamic list of services

## 1.63.0 - 19.10.2021

### Added

- Added a public page to share the portfolio

### Changed

- Improved the skeleton loader size of the portfolio proportion chart component

### Todo

- Apply data migration (`yarn database:migrate`)

## 1.62.0 - 17.10.2021

### Added

- Extended the validation message of the import functionality for transactions

## 1.61.0 - 15.10.2021

### Added

- Extended the import functionality for transactions by `csv` files
- Introduced the primary data source

### Changed

- Restricted the file selector of the import functionality for transactions to `csv` and `json`

## 1.60.0 - 13.10.2021

### Added

- Extended the validation of the import functionality for transactions
  - Valid data types
  - Maximum number of orders
  - No duplicate orders
  - Data provider service returns data for the `dataSource` / `symbol` pair

### Changed

- Harmonized the page layouts

### Fixed

- Fixed the broken line charts showing value labels

## 1.59.0 - 11.10.2021

### Added

- Added a data enhancer for symbol profile data (countries and sectors) via _Trackinsight_

### Changed

- Changed the values of the global heat map to fixed-point notation

### Fixed

- Fixed the links of cryptocurrency assets in the positions table
- Fixed various values in the impersonation mode which have not been nullified

## 1.58.1 - 03.10.2021

### Fixed

- Fixed an issue in the symbol conversion for _Yahoo Finance_ (for a cryptocurrency with the same code as a currency)

## 1.58.0 - 02.10.2021

### Changed

- Improved the symbol conversion for _Yahoo Finance_: Support for _Solana USD_ (`SOL1-USD`)
- Improved the tooltips of the allocations page
- Upgraded `envalid` from version `7.1.0` to `7.2.1`

## 1.57.0 - 29.09.2021

### Added

- Added a protection for endpoints (subscriptions)

### Changed

- Reformatted the exchange rates table in the admin control panel

## 1.56.0 - 25.09.2021

### Added

- Added a story for the line chart component
- Added a story for the portfolio proportion chart component

### Changed

- Changed the navigation to always show the portfolio page
- Migrated the data type of currencies from `enum` to `string` in the database
- Supported unlimited currencies (instead of `CHF`, `EUR`, `GBP` and `USD`)
- Respected the accounts' currencies in the exchange rate service

### Fixed

- Hid the actions from the accounts table in the _Presenter View_
- Hid the actions from the transactions table in the _Presenter View_
- Fixed the data gathering of the initial project setup (database seeding)

### Todo

- Apply data migration (`yarn database:migrate`)

## 1.55.0 - 20.09.2021

### Changed

- Removed the default value of the data source attribute
- Upgraded `@storybook` dependencies

### Fixed

- Fixed an issue in the create or edit transaction dialog

### Todo

- Apply data migration (`yarn database:migrate`)

## 1.54.0 - 18.09.2021

### Added

- Added the data source attribute to the symbol profile model

### Changed

- Respected the data source attribute in the data provider service
- Respected the data source attribute in the symbol data endpoint
- Improved the search functionality of the data management (multiple data sources)

### Fixed

- Hid the net performance in the _Presenter View_ (portfolio holdings and summary tab on the home page)
- Hid the sign if the performance is zero in the value component

### Todo

- Apply data migration (`yarn database:migrate`)

## 1.53.0 - 13.09.2021

### Changed

- Optimized the annualized performance calculation
- Changed the data gathering selection from distinct orders to symbol profiles

## 1.52.0 - 11.09.2021

### Added

- Added the annualized performance to the portfolio summary tab on the home page
- Added the Ghostfolio Slack channel to the about page

### Changed

- Upgraded `@simplewebauthn/browser` and `@simplewebauthn/server` from version `3.0.0` to `4.1.0`

### Fixed

- Fixed the sign in with fingerprint for some android devices

## 1.51.0 - 11.09.2021

### Changed

- Provided the name in the portfolio position endpoint

## 1.50.0 - 11.09.2021

### Fixed

- Fixed the _Fear & Greed Index_ (market mood)
- Fixed the overlap of the home button with tabs on iOS (_Add to Home Screen_)

## 1.49.0 - 08.09.2021

### Added

- Added labels to the allocation chart by symbol on desktop

## 1.48.0 - 07.09.2021

### Added

- Added the attribute `precision` in the value component

### Fixed

- Hid the performance in the _Presenter View_

## 1.47.1 - 06.09.2021

### Fixed

- Fixed the search functionality for cryptocurrency symbols

## 1.46.0 - 05.09.2021

### Added

- Extended the statistics section on the about page by the _GitHub_ contributors count
- Set up _Storybook_
  - Added a story for the logo component
  - Added a story for the no transactions info component
  - Added a story for the trend indicator component
  - Added a story for the value component

### Changed

- Switched from gross to net performance
- Restructured the portfolio summary tab on the home page (fees and net performance)

## 1.45.0 - 04.09.2021

### Added

- Added a link below the holdings to manage the transactions
- Added the allocation chart by symbol

### Changed

- Restructured the allocations page
- Upgraded `angular` from version `12.0.4` to `12.2.4`
- Upgraded `@angular/cdk` and `@angular/material` from version `12.0.6` to `12.2.4`
- Upgraded `Nx` from version `12.5.4` to `12.8.0`
- Upgraded `prisma` from version `2.24.1` to `2.30.2`

### Fixed

- Fixed the value formatting for integers (transactions count)

## 1.44.0 - 30.08.2021

### Changed

- Extended the sub classification of assets by cash
- Upgraded `svgmap` from version `2.1.1` to `2.6.0`

### Fixed

- Filtered out positions without any quantity in the positions table
- Improved the symbol lookup: allow saving with valid symbol in create or edit transaction dialog

## 1.43.0 - 24.08.2021

### Added

- Extended the data management of symbol profile data by countries (automated for stocks)
- Added a fallback for initially loading currencies if historical data is not yet available

## 1.42.0 - 22.08.2021

### Added

- Added the subscription type to the users table of the admin control panel
- Introduced the sub classification of assets

### Todo

- Apply data migration (`yarn database:migrate`)

## 1.41.0 - 21.08.2021

### Added

- Added a link to the system status page

### Changed

- Improved the wording for the _Restricted View_: _Presenter View_
- Improved the styling of the tables
- Ignored cash assets in the allocation chart by sector, continent and country

### Fixed

- Fixed an issue in the allocation chart by account (wrong calculation)
- Fixed an issue in the allocation chart by account (missing cash accounts)

## 1.40.0 - 19.08.2021

### Changed

- Improved the fault tolerance of the portfolio details endpoint

### Fixed

- Fixed the node engine version mismatch in `package.json`
- Fixed an issue on the buy date in the position detail dialog
- Fixed an issue with the currency inconsistency in the _Yahoo Finance_ service (convert from `GBp` to `GBP`)

## 1.39.0 - 16.08.2021

### Added

- Added an option to hide absolute values like performances and quantities (_Restricted View_)

### Changed

- Restructured the allocations page

### Fixed

- Fixed an issue with the performance in the portfolio summary tab on the home page (impersonation mode)
- Fixed various values in the impersonation mode which have not been nullified

### Removed

- Removed the current net performance
- Removed the read foreign portfolio permission

### Todo

- Apply data migration (`yarn database:migrate`)

## 1.38.0 - 14.08.2021

### Added

- Added the overview menu item on mobile

### Changed

- Refactored the exchange rate service
- Improved the users table in the admin control panel

## 1.37.0 - 13.08.2021

### Added

- Added the calculated net worth to the portfolio summary tab on the home page
- Added the calculated time in market to the portfolio summary tab on the home page

### Changed

- Improved the usability of the tabs on the home page
- Restructured the portfolio summary tab on the home page
- Upgraded `angular-material-css-vars` from version `2.1.0` to `2.1.2`

### Fixed

- Fixed the position detail chart if there are missing historical data around the first buy date
- Fixed the snack bar background color in dark mode
- Fixed the search functionality for symbols (filter for supported currencies)

## 1.36.0 - 09.08.2021

### Changed

- Improved the data gathering handling on server restart
- Respected the cash balance on the allocations page
- Eliminated the name from the scraper configuration

### Fixed

- Fixed hidden cryptocurrency holdings

## 1.35.0 - 08.08.2021

### Changed

- Hid the pagination of tabs
- Improved the classification of assets
- Improved the support for future transactions (drafts)
- Optimized the accounts table for mobile
- Upgraded `chart.js` from version `3.3.2` to `3.5.0`

### Fixed

- Added a fallback if the exchange rate service has not been initialized correctly

### Todo

- Apply data migration (`yarn database:migrate`)

## 1.34.0 - 07.08.2021

### Changed

- Restructured the page hierarchy

### Fixed

- Fixed an issue with the currency conversion of the market price in the position detail dialog
- Fixed the chart and missing data of positions from the past in the position detail dialog

## 1.33.0 - 05.08.2021

### Fixed

- Fixed an issue of a division by zero in the portfolio calculations
- Fixed an issue with the currency conversion in the position detail dialog

## 1.32.0 - 04.08.2021

### Added

- Added the name to the position detail dialog when opened from the transactions table
- Added a screenshot to the blog posts

### Fixed

- Fixed the missing market state in the positions tab
- Fixed the chart of positions with differing currency from user

## 1.31.1 - 01.08.2021

### Fixed

- Fixed an issue with the currency conversion in the portfolio calculations

## 1.31.0 - 01.08.2021

### Added

- Added more data points to the chart

### Changed

- Rewritten the core engine for the portfolio calculations
  - Switched to [Time-Weighted Rate of Return](https://www.investopedia.com/terms/t/time-weightedror.asp) (TWR) for the performance calculation
  - Improved the performance of the portfolio calculations

## 1.30.0 - 31.07.2021

### Added

- Added the date range component to the positions tab
- Added a blog

## 1.29.0 - 26.07.2021

### Changed

- Introduced tabs on the home page
- Changed the menu icon if the menu is open on mobile

## 1.28.0 - 24.07.2021

### Added

- Extended the data management by symbol profile data
- Added a currency attribute to the symbol profile model
- Added a positions button on the home page which scrolls into the view

### Changed

- Improved the style of the active page in the navigation on desktop
- Removed the footer for users
- Extended the _Zen Mode_ by positions
- Improved the _Create Account_ message in the _Live Demo_

## 1.27.0 - 18.07.2021

### Changed

- Improved the onboarding
  - Flow of creating a new account
  - Info message to add the first transaction

### Fixed

- Fixed the chart on the landing page
- Fixed the url to the _Fear & Greed Index_ on the resources page

## 1.26.0 - 17.07.2021

### Added

- Added the import functionality for transactions
- Added the `robots.txt` file

### Changed

- Improved the styling of the current pricing plan
- Improved the styling of the transaction type badge
- Set the public _Stripe_ key dynamically
- Upgraded `angular-material-css-vars` from version `2.0.0` to `2.1.0`

### Fixed

- Fixed the warn color (button) of the theme

## 1.25.0 - 11.07.2021

### Added

- Added the export functionality for transactions

### Changed

- Respected the cash balance on the analysis page
- Improved the settings selectors on the account page
- Harmonized the slogan to "Open Source Wealth Management Software"

### Fixed

- Fixed rendering of currency and platform in dialogs (account and transaction)
- Fixed an issue in the calculation of the average buy prices in the position detail chart

## 1.24.0 - 07.07.2021

### Added

- Added the total value in the create or edit transaction dialog
- Added a balance attribute to the account model
- Calculated the total balance (cash)

### Changed

- Upgraded `@angular/cdk` and `@angular/material` from version `11.0.4` to `12.0.6`
- Upgraded `@nestjs` dependencies
- Upgraded `angular-material-css-vars` from version `1.2.0` to `2.0.0`
- Upgraded `Nx` from version `12.3.6` to `12.5.4`

## 1.23.1 - 03.07.2021

### Fixed

- Fixed the investment chart (drafts)

## 1.23.0 - 03.07.2021

### Added

- Added support for future transactions (drafts)

## 1.22.0 - 25.06.2021

### Added

- Set the user id in the _Stripe_ callback

## 1.21.0 - 22.06.2021

### Changed

- Changed _Stripe_ mode from `subscription` to `payment`

### Fixed

- Fixed the base currency on the pricing page

## 1.20.0 - 21.06.2021

### Added

- Set up _Stripe_ for subscriptions

### Changed

- Improved the style of the _Ghostfolio in Numbers_ section

## 1.19.0 - 17.06.2021

### Added

- Added a _Ghostfolio in Numbers_ section to the about page

## 1.18.0 - 16.06.2021

### Changed

- Improved the pie chart: Investments by sector
- Improved the onboarding for TWA by redirecting to the account registration page

## 1.17.0 - 15.06.2021

### Changed

- Improved the error page of the sign in with fingerprint
- Disable the sign in with fingerprint selector for the demo user
- Upgraded `angular` from version `11.2.4` to `12.0.4`
- Upgraded `angular-material-css-vars` from version `1.1.2` to `1.2.0`
- Upgraded `chart.js` from version `3.2.1` to `3.3.2`
- Upgraded `date-fns` from version `2.19.0` to `2.22.1`
- Upgraded `eslint` and `prettier` dependencies
- Upgraded `ngx-device-detector` from version `2.0.6` to `2.1.1`
- Upgraded `ngx-markdown` from version `11.1.2` to `12.0.1`

## 1.16.0 - 14.06.2021

### Changed

- Improved the sign in with fingerprint

## 1.15.0 - 14.06.2021

### Added

- Added a counter column to the transactions table
- Added a label to indicate the default account in the accounts table
- Added an option to limit the items in pie charts
- Added sign in with fingerprint

### Changed

- Cleaned up the analysis page with an unused chart module
- Improved the cell alignment in the users table of the admin control panel

### Fixed

- Fixed the last activity column of users in the admin control panel

## 1.14.0 - 09.06.2021

### Added

- Added a connect or create symbol profile model logic on creating a new transaction

### Changed

- Improved the global heat map to visualize investments by country

## 1.13.0 - 08.06.2021

### Added

- Added a global heat map to visualize investments by country

## 1.12.0 - 06.06.2021

### Added

- Added a symbol profile model with additional data
- Added new pie charts: Investments by continent and country

## 1.11.0 - 05.06.2021

### Added

- Added a dedicated page for the account registration
- Rendered the average buy prices in the position detail chart (useful for recurring transactions)
- Introduced the initial prisma migration

### Changed

- Changed the buttons to links (`<a>`) on the tools page
- Upgraded `prisma` from version `2.20.1` to `2.24.1`

## 1.10.1 - 02.06.2021

### Fixed

- Fixed an optional type in the user interface

## 1.10.0 - 02.06.2021

### Changed

- Moved the tools to a sub path (`/tools`)
- Extended the pricing page and aligned with the subscription model

## 1.9.0 - 01.06.2021

### Added

- Added the year labels to the investment chart on the x-axis

### Changed

- Respected the data source attribute of the transactions model in the data management for historical data
- Prettified the generic scraper symbols in the transaction filtering component
- Changed to the strict mode of distance formatting between two given dates

### Fixed

- Fixed the sorting in various tables
- Made the order of the rules in the _X-ray_ section consistent

## 1.8.0 - 24.05.2021

### Added

- Added a section for _Analysis_, _X-ray_ and upcoming tools

### Changed

- Introduced a user service implemented as an observable store (single source of truth for state)

### Fixed

- Fixed the performance chart by considering the investment
- Fixed missing header of public pages (_About_, _Pricing_, _Resources_)

## 1.7.0 - 22.05.2021

### Changed

- Hid footer on mobile (except on landing page)

### Fixed

- Fixed the internal navigation of the _Zen Mode_ in combination with a query parameter

## 1.6.0 - 22.05.2021

### Added

- Added an index in the users table of the admin control panel

### Changed

- Improved the alignment in the users table of the admin control panel

## 1.5.0 - 22.05.2021

### Added

- Added _Zen Mode_: the distraction-free view

## 1.4.0 - 20.05.2021

### Added

- Added filtering by year in the transaction filtering component

### Changed

- Renamed _Ghostfolio Account_ to _My Ghostfolio_
- Hid unknown exchange in the position overview
- Disable the base currency selector for the demo user
- Refactored the portfolio unit tests to work without database
- Refactored the search functionality of the data management (aligned with data source)
- Renamed shared helper to `@ghostfolio/common/helper`
- Moved shared interfaces to `@ghostfolio/common/interfaces`
- Moved shared types to `@ghostfolio/common/types`

## 1.3.0 - 15.05.2021

### Changed

- Refactored the active menu item state by parsing the current url
- Used a desaturated background color for unknown types in pie charts
- Renamed the columns _Initial Share_ and _Current Share_ to _Initial Allocation_ and _Current Allocation_ in the positions table

### Fixed

- Fixed the link to the pricing page

## 1.2.1 - 14.05.2021

### Changed

- Updated the sitemap

## 1.2.0 - 14.05.2021

### Changed

- Harmonized the style of various tables
- Keep the color per type when switching between _Initial_ and _Current_ in pie charts
- Upgraded `chart.js` from version `3.0.2` to `3.2.1`
- Moved the pricing section to a dedicated page
- Improved the style of the transaction filtering component

### Fixed

- Fixed the tooltips when switching between _Initial_ and _Current_ in pie charts

## 1.1.0 - 11.05.2021

### Added

- Added a button to fetch the current market price in the create or edit transaction dialog

### Changed

- Improved the transaction filtering with multi filter support

### Fixed

- Fixed the filtering by account name in the transactions table
- Fixed the active menu item state when a modal has opened

## 1.0.0 - 05.05.2021

### Added

- Added the functionality to clone a transaction
- Added a _Google Play_ badge on the landing page

### Changed

- Changed to maskable icons

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

- Improved the users table styling of the admin control panel
- Improved the background colors in the dark mode

## 0.92.0 - 25.04.2021

### Added

- Prepared further for multi accounts support: store account for new transactions
- Added a horizontal scrollbar to the users table of the admin control panel

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

- Improved the users table of the admin control panel

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

- Fixed an issue in the users table of the admin control panel with missing data

## 0.86.1 - 18.04.2021

### Added

- Added the license to the about page
- Added a validation for environment variables
- Added support for feature flags to simplify the initial project setup

### Changed

- Changed the about page for the new license
- Optimized the data management for historical data
- Optimized the exchange rate service
- Improved the users table of the admin control panel

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
