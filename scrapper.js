require("dotenv").config();

const puppeteer = require("puppeteer");
const { createObjectCsvWriter } = require("csv-writer");
const path = require("path");
const os = require("os");


// -------- CONFIG --------

const USERNAME = process.env.IG_USERNAME;
const PASSWORD = process.env.IG_PASSWORD;


const links = [
    "https://www.instagram.com/alizaanis/",
    "https://www.instagram.com/foodeebaba/",
    "https://www.instagram.com/amnaashrafff/",
    "https://www.instagram.com/kuch_extra_kar/",
    "https://www.instagram.com/abdullah.adil1/",
    "https://www.instagram.com/saqibmobeen/",
    "https://www.instagram.com/fahad.chaudharyy/",
    "https://www.instagram.com/chefjavaria/",
    "https://www.instagram.com/reeby_eats/",
    "https://www.instagram.com/kainat_khan_zada/",
    "https://www.instagram.com/hunger_talesss/",
    "https://www.instagram.com/livingwithmilli/",
    "https://www.instagram.com/wajihansarii/",
    "https://www.instagram.com/the.fooddesk/",
    "https://www.instagram.com/realwowboy/",
    "https://www.instagram.com/hungrywandererpk/",
    "https://www.instagram.com/sham_world7/",
    "https://www.instagram.com/foodcon._/",
    "https://www.instagram.com/aafo_ods/",
    "https://www.instagram.com/haseebeedxb/",
    "https://www.instagram.com/currlygurrll/",
    "https://www.instagram.com/chdanishofficial/",
    "https://www.instagram.com/nimz_foodblog/",

];

// -------- HELPERS --------
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanNumber(text) {
    if (!text) return "N/A";
    text = text.replace(/,/g, "");
    if (text.includes("M")) return (parseFloat(text) * 1_000_000).toFixed(0);
    if (text.includes("K")) return (parseFloat(text) * 1_000).toFixed(0);
    return text.replace(/[^0-9]/g, "");
}

// -------- MAIN --------
(async () => {
    const browser = await puppeteer.launch({
        headless: false, // set true to run in background
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
        ],
        defaultViewport: null,
    });

    const page = await browser.newPage();

    // Spoof user agent
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Hide webdriver flag
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    // -------- LOGIN --------
    console.log("🔐 Logging in...");
    await page.goto("https://www.instagram.com/accounts/login/", {
        waitUntil: "networkidle2",
    });
    await sleep(3000);

    await page.type('input[name="email"]', USERNAME, { delay: 80 });
    await page.type('input[name="pass"]', PASSWORD, { delay: 80 });
    await sleep(1000);

    await page.click('[aria-label="Log In"]');
    await sleep(6000);

    // -------- DISMISS POPUPS --------
    for (let i = 0; i < 2; i++) {
        try {
            const notNow = await page.$x("//button[contains(text(), 'Not Now')]");
            if (notNow.length > 0) {
                await notNow[0].click();
                await sleep(2000);
            }
        } catch { }
    }

    console.log("✅ Logged in!\n");

    // -------- SCRAPE PROFILES --------
    const results = [];

    for (const link of links) {
        console.log(`🔍 Scraping: ${link}`);

        try {
            await page.goto(link, { waitUntil: "networkidle2", timeout: 30000 });
            await sleep(4000);
            const data = await page.evaluate(() => {
                const username = document.querySelector("h2 span")?.innerText.trim() || "N/A";

                // Posts: span containing "posts" text — number is in html-span inside it
                const allSpans = [...document.querySelectorAll("span")];

                const postsSpan = allSpans.find(s => s.innerText.includes("posts"));
                const posts = postsSpan?.querySelector("span span")?.innerText || "N/A";

                // Followers: span with title attribute
                const followersSpan = document.querySelector('span[title]');
                const followers = followersSpan?.getAttribute("title") || "N/A";

                // Following: span containing "following" text
                const followingSpan = allSpans.find(s => s.innerText.endsWith("following"));
                const following = followingSpan?.querySelector("span span")?.innerText || "N/A";

                return { username, posts, followers, following };
            });

            // Print in terminal

            const cleaned = {
                username: data.username,
                posts: cleanNumber(data.posts),
                followers: cleanNumber(data.followers),
                following: cleanNumber(data.following),
                profile: link,
            };

            results.push(cleaned);
            console.log("✅", cleaned);
        } catch (err) {
            console.log(`❌ Failed: ${link}\n   Reason: ${err.message}`);
        }

        await sleep(3000); // polite delay between profiles
    }

    // -------- SAVE CSV --------
    const timestamp = new Date().toTimeString().slice(0, 8).replace(/:/g, "");
    const filePath = path.join(os.homedir(), "Desktop", `instagram_data_${timestamp}.csv`);

    const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
            { id: "username", title: "Username" },
            { id: "followers", title: "Followers" },
            { id: "following", title: "Following" },
            { id: "posts", title: "Posts" },
            { id: "profile", title: "Profile URL" },
        ],
    });

    await csvWriter.writeRecords(results);
    console.log(`\n✅ Data saved to: ${filePath}`);

    await browser.close();
})();