/* COINFIN CURVE · single source of truth for addresses and locked parameters.
   Contracts deployed 2026-11-13 (Sourcify exact match). Mint, seasons and
   claim open on a separate order; readers degrade gracefully until then. */
window.CFIN = {
  chainId: 56,
  fin: "0xB4C9efA5f217a75f48F3f58508ca1D70Df0d8CF4",
  finSupply: "5000000000",
  pass: "0x5877D2bb9F226cC3E438F4d656cAeb27DEAFC576",
  curve: "0x5d495321e02E63A9D277dE55938A5406b0f72c52",
  vault: "0xF6414e89B55cc32D5E3AB9754526344D970BA4E5",
  claim: "0x736B903C8d86Fa2F139032A27c702FC7269Cfa33",
  projectWallet: "0xAA7620954c1f61292d02275e7F147E47E62fa068",

  passSupply: 10000,
  passMaxPerWallet: 20,
  passTiersBnb: ["0", "0.0002", "0.0004", "0.0008"],
  questionSalt: "COINFIN-Q",

  graduationBnb: 8,
  capNormal: 1,       /* percent of token supply per wallet, pre-graduation */
  capPass: 2,         /* percent for Pass holders */
  taxTotal: 5,
  taxCreator: 2,
  taxPlatform: 2,
  taxVault: 1,
  launchFeeBnb: "0.05",

  seasonDays: 14,
  seasonGenesis: null, /* unix seconds of Season 1 start, set at opening */
  finPerPass: "250000",

  pancakeSwap: "https://pancakeswap.finance/swap?outputCurrency=0xB4C9efA5f217a75f48F3f58508ca1D70Df0d8CF4",
  bscscan: "https://bscscan.com"
};
