// Octee Airlines site settings.
// The site is 100% static (GitHub Pages): there is NO server and NO database.
// Accounts, Octmiles, trips and reviews are saved in each visitor's own browser (localStorage).
export const CONFIG = {
  // Usernames: 3–20 letters, numbers or underscores
  PASSWORD_MIN: 8,

  // Side clock
  FIA_TIMEZONE: "Asia/Singapore",   // Fuji International Airport
  SIA_TIMEZONE: "Asia/Singapore",   // Scraggy International Airport (same as the Scraggy project)

  // The live Scraggy Airlines site. Octee loads its js/data.js so SA flights always match.
  // If it can't load (offline, or the live site is older), js/scraggy-data-snapshot.js is used.
  SCRAGGY_SITE_URL: "https://zengyixin0205.github.io/Scraggy-airlines/",

  // How many clicks on the logo open the Control Tower, and how fast (ms)
  TOWER_CLICKS: 8,
  TOWER_WINDOW_MS: 4000
};
