# Licensed cinema provider investigation

Reviewed 3 November 2026 against the public official documentation linked below. No provider was contacted, no contract was obtained, and no production inventory or transaction was verified. Public API availability does not establish MovieVerse's entitlement to Indian inventory.

| Provider | Publicly documented capabilities | Indian chains/city coverage for this project | Access and commercial requirements |
| --- | --- | --- | --- |
| MovieXchange | Chain/site/film/showtime reference data with ticket types; separately licensed seating and booking APIs | NOT VERIFIED. No approved list of Indian chains, sites or cities has been supplied | Application account, authentication, client secret, applicable reference and transactional licences, exhibitor/territory entitlement, staging and production access |
| Vista Digital Platform / Connect | Cinema-oriented ticketing, seating and order services; deployment and access arranged with Vista | NOT VERIFIED. A chain using Vista does not automatically expose its inventory to MovieVerse | Contact Vista representative and cinema operator; establish approved chain/site access, credentials, exact API generation and commercial terms |
| MovieGlu | Movie/cinema information, screening schedules and outbound booking links | NOT VERIFIED for the requested Indian cities/chains. Obtain a current written coverage report and samples | Account, market entitlement, authentication headers, plan/rate limits, permitted reuse and affiliate/deep-link terms. Not a seat-selection/payment provider |

## MovieXchange

The official [reference API guide](https://apidocs.moviexchange.com/docs/apis) documents authentication followed by chains, sites, films, and site showtimes including ticket types. It recommends reference-data batch ingestion, typically no more frequently than hourly. Such reference data must not be used to decide whether a seat can be booked.

The [transactional guide](https://apidocs.moviexchange.com/docs/testpage) describes creating an order with tickets, obtaining a seating plan, setting seats and customer details, and completing the order. MX Tickets and MX Items are separately licensed, and the guide specifies external payments. A separate payment integration is therefore still needed.

[Authentication and client secrets](https://apidocs.moviexchange.com/docs/authentication-and-client-secrets) describes server-side authentication, provider-issued application credentials and the client-secret requirement. [FAQs](https://apidocs.moviexchange.com/docs/faqs) distinguish staging and production services. Credentials and entitled chains must come from the provider; they are not guessed or provisioned by this code.

There is no verified Indian chain entitlement for this project. PVR INOX, Cinepolis and other names must not be marked bookable merely because they appear in a location directory. The existing generic adapter is a normalization boundary, not a native MovieXchange implementation.

## Other legitimate routes

[Vista's Digital Platform](https://developer.vista.co/digital-platform) describes ticketing/seating capabilities, and its [getting-started guide](https://developer.vista.co/digital-platform/getting-started) directs operators to their Vista representative for access. Evaluate a chain-approved Vista integration after the intended operator and deployment are known. Do not reuse another cinema's documented production or laboratory endpoints.

The [MovieGlu developer index](https://developer.movieglu.com/) documents cinema and film showtimes. Its [purchase confirmation documentation](https://developer.movieglu.com/v2/api-index/purchaseconfirmation/) explicitly distinguishes outbound ticket purchases from its own service and states that it does not support seat selection or payments. Its [quick-start guide](https://developer.movieglu.com/v2/api-index/quick-start-guide/) distinguishes evaluation access from country coverage discussions. It may serve discovery/deep links after licensed access is confirmed, but cannot complete the live seat-booking roadmap alone.

Direct cinema-chain agreements remain an alternative. No public self-service Indian-chain transaction contract, approved inventory feed, pricing agreement or credential has been supplied for this project. BookMyShow scraping, browser endpoint replay, and bypassing access controls are not proposed.

## Written answers required before production connection

1. Is India supported under the offered contract? Provide exact supported cities, cinema chain/site IDs, screens, and exclusions, including Mumbai and Nagpur.
2. Which APIs are licensed: reference schedules, ticket categories/prices, seat plans, seat holds, customer data, order completion, booking lookup, cancellation, refund and admission barcodes?
3. Which staging and production base URLs, authentication mechanism, credentials, token lifetimes, client secrets, IP restrictions and test tenants apply?
4. How do film IDs map to TMDB, and how are provider chain/site/screen/show IDs mapped to MovieVerse cities and cinema-directory records? Who owns duplicate resolution and feed freshness?
5. What are the hold duration, inventory-refresh rules, seat-state meanings, concurrency guarantees, price currency/units, taxes, fees and final quote semantics?
6. Who is merchant of record? Which payment methods are permitted? What proof must be submitted at completion? How are paid-but-unconfirmed orders reconciled, cancelled or refunded?
7. What are the idempotency and timeout/retry rules? Which lookup or webhook establishes a final confirmed booking after an ambiguous timeout?
8. Which returned QR/barcode is valid at the cinema? What validation, collection, cancellation and anti-replay rules apply?
9. What are the request limits, supported refresh schedule, cache permissions, SLA, support/escalation process, branding rules, redistribution restrictions, onboarding/certification steps and commercial charges?

Do not activate `LIVE_SHOWTIMES_APPROVED=true` until the relevant feed rights and coverage have been established. Passing local fixture tests is not acceptance by an exhibitor or provider.
