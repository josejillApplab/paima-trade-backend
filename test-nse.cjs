import { NseIndia } from "stock-nse-india";

const nseIndia = new NseIndia();

async function testFetch() {
    try {
        console.log("Fetching RELIANCE...");
        const details = await nseIndia.getEquityDetails('RELIANCE');
        console.log("Details fetched.");
        console.log("Current Price:", details.priceInfo.lastPrice);
    } catch (error) {
        console.error("Error:", error);
    }
}

testFetch();
