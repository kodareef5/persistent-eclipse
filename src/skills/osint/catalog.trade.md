# Commodity, trade, infrastructure, and supply chains

Source routes from the operator-supplied Round 2 fieldbook. These are documented
leads, not a claim that every API was tested. See [provenance](fieldbook.md) and
[catalog conventions](catalog.md); use the original documentation before collection.

| Source | Investigative opening | Limit |
| --- | --- | --- |
| [IMF PortWatch](https://portwatch.imf.org/) | Spot changes in shipping activity and choke-point exposure before downstream earnings narratives develop. | Vessel-tracking-based indicators are estimates; port arrival ≠ delivered commodity volume. |
| [USITC DataWeb](https://www.usitc.gov/applications/dataweb/about) | Break out U.S. trade by HTS code, partner, and time to investigate import substitution and tariff effects. | HS/HTS coding, re-exports, valuation and lags can make neat trendlines misleading. |
| [UN Comtrade API](https://uncomtrade.org/docs/un-comtrade-api/) | Compare bilateral product-level trade over many countries and vintages. | Preview versus licensed/full access; reporting revisions and missing partners. [Use policy](https://uncomtrade.org/docs/policy-on-comtrade-data-use/) prohibits certain collection methods. |
| [Global Trade Alert](https://globaltradealert.org/data-access) | Follow new subsidies, tariffs, export controls and industrial policies across governments. | Policy announcement ≠ implemented measure; the commercial API may require licensing. |
| [S&P Panjiva](https://www.spglobal.com/market-intelligence/en/solutions/products/panjiva-supply-chain-intelligence) | Find shipment-level company trading relationships and changing ports/products. | Paid; customs geographies and coverage skew; shipment ≠ contract economics. |
| [USGS Mineral Commodity Summaries](https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries) | Establish capacity, production, trade and mineral baseline for a rare-earth thesis. | Annual backward-looking statistics; commodity categories can hide processing bottlenecks. |
| [IEA Oil Market Report](https://www.iea.org/data-and-statistics/data-product/oil-market-report-omr) / [data portal](https://www.iea.org/data-and-statistics) | Professional supply/demand scenario framing; check whether a market claim differs from known balances. | Report editions, forecast revisions and paid access vary; do not treat a forecast as observed fact. |
| [EIA data API](https://www.eia.gov/opendata/) | Time-series production, inventories, prices, refinery activity and expected releases. | Seasonal adjustments, revisions, units, and report timing matter. |
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) | Near-real-time thermal detections around industrial or geographic events; corroborate public incident reports. | Thermal anomaly ≠ confirmed site damage; later science-quality data may supersede near-real-time. |
| [Copernicus Data Space](https://dataspace.copernicus.eu/) | Compare optical/radar imagery of facilities, mines, ports and land cover across dates. | Cloud, spatial resolution, acquisition angles and collection gaps can create false impressions. |
| [Global Fishing Watch](https://globalfishingwatch.org/our-apis/documentation/) | Public vessel movement/activity patterns as a template for maritime inference. | AIS gaps and modeled **apparent** activity are not definitive proof; API access is documented as noncommercial; check the applicable dataset terms before use. |

### Investigation seeds

A mine's alleged commissioning date can be challenged by permits, satellite observations, mineral processing constraints, port activity and downstream buyer disclosures. No one dataset proves production. The power lies in **independent timing constraints**.
