import { ethers } from "ethers";

// ---- Arc network configuration -------------------------------------------
// Mainnet values as published at Arc mainnet launch (chain 5042, USDC gas).
// Testnet values from docs.arc.io.
export const NETWORKS = {
  mainnet: {
    key: "mainnet",
    name: "Arc Mainnet",
    chainId: 5042,
    chainIdHex: "0x13b2",
    rpc: "https://rpc.mainnet.arc.io",
    explorer: "https://explorer.arc.io",
  },
  testnet: {
    key: "testnet",
    name: "Arc Testnet",
    chainId: 5042002,
    chainIdHex: "0x4cef52",
    rpc: "https://rpc.testnet.arc.network",
    explorer: "https://testnet.arcscan.app",
  },
};

export const NETWORK =
  NETWORKS[import.meta.env.VITE_ARC_NETWORK] || NETWORKS.mainnet;

// USDC ERC-20 interface address on Arc (same address both networks, 6 decimals).
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

// Set VITE_TURNO_CONTRACT_ADDRESS after deployment. Empty = preview mode.
export const CONTRACT_ADDRESS =
  import.meta.env.VITE_TURNO_CONTRACT_ADDRESS || "";

export const LIVE = CONTRACT_ADDRESS.length > 0;

// ---- ABIs (human-readable, ethers v6) -------------------------------------
export const TURNO_ABI = [
  "function createCircle(address[] members, uint256 contribution, uint256 roundDuration) returns (uint256 circleId)",
  "function contribute(uint256 circleId)",
  "function refund(uint256 circleId)",
  "function circleCount() view returns (uint256)",
  "function getCircle(uint256 circleId) view returns (address creator, uint256 contribution, uint256 round, uint256 paidCount, uint256 memberCount, bool completed, bool cancelled, uint256 roundEnd)",
  "function getMembers(uint256 circleId) view returns (address[])",
  "function hasPaid(uint256 circleId, address member) view returns (bool)",
  "function canRefund(uint256 circleId, address member) view returns (bool)",
  "function currentRecipient(uint256 circleId) view returns (address)",
  "function potSize(uint256 circleId) view returns (uint256)",
  "event CircleCreated(uint256 indexed circleId, address indexed creator, uint256 contribution, uint256 memberCount, uint256 roundDuration)",
  "event Contribution(uint256 indexed circleId, uint256 indexed round, address indexed member, uint256 amount)",
  "event Payout(uint256 indexed circleId, uint256 indexed round, address indexed recipient, uint256 amount)",
  "event CircleCompleted(uint256 indexed circleId)",
  "event CircleCancelled(uint256 indexed circleId, uint256 indexed round)",
  "event Refund(uint256 indexed circleId, uint256 indexed round, address indexed member, uint256 amount)",
];

export const USDC_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

// ---- Helpers ---------------------------------------------------------------
export const USDC_DECIMALS = 6;

export function fmtUSDC(raw) {
  if (raw === null || raw === undefined) return "—";
  return ethers.formatUnits(raw, USDC_DECIMALS);
}

export function parseUSDC(text) {
  return ethers.parseUnits(text, USDC_DECIMALS);
}

export function shortAddr(a) {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

// Round length limits enforced by the contract (1 hour to 90 days).
export const MIN_ROUND_HOURS = 1;
export const MAX_ROUND_HOURS = 24 * 90;

// Gas limit for a write call: the node's estimate plus a 30% buffer, falling
// back to a fixed limit when estimation fails. The final contribution of a
// round also pays the pot out, so it is the most expensive call and the one an
// under-priced estimate would break.
const FALLBACK_GAS = 600000n;
export async function gasOverrides(contractMethod, ...args) {
  try {
    const estimate = await contractMethod.estimateGas(...args);
    return { gasLimit: (estimate * 130n) / 100n };
  } catch {
    return { gasLimit: FALLBACK_GAS };
  }
}

export function fmtDeadline(unixSeconds) {
  return new Date(Number(unixSeconds) * 1000).toLocaleString();
}

export function readProvider() {
  return new ethers.JsonRpcProvider(NETWORK.rpc);
}

export function readContract() {
  return new ethers.Contract(CONTRACT_ADDRESS, TURNO_ABI, readProvider());
}

export async function walletProvider() {
  if (!window.ethereum) throw new Error("No wallet found in this browser.");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== NETWORK.chainId) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: NETWORK.chainIdHex }],
      });
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: NETWORK.chainIdHex,
              chainName: NETWORK.name,
              rpcUrls: [NETWORK.rpc],
              nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
              blockExplorerUrls: [NETWORK.explorer],
            },
          ],
        });
      } else {
        throw err;
      }
    }
  }
  return provider;
}
