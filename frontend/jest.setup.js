import "@testing-library/jest-dom";

// Mock wagmi hooks for testing
jest.mock("wagmi", () => ({
  useAccount: jest.fn(() => ({
    address: "0x1234567890123456789012345678901234567890",
    isConnected: true,
  })),
  useReadContract: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useWriteContract: jest.fn(() => ({
    writeContract: jest.fn(),
    isPending: false,
  })),
  useWatchContractEvent: jest.fn(() => jest.fn()),
  usePublicClient: jest.fn(() => ({
    getBlockNumber: jest.fn(() => Promise.resolve(BigInt(12345))),
    getLogs: jest.fn(() => Promise.resolve([])),
    watchEvent: jest.fn(() => jest.fn()),
  })),
}));

// Mock @reown/appkit
jest.mock("@reown/appkit/react", () => ({
  useAppKit: jest.fn(() => ({
    open: jest.fn(),
    close: jest.fn(),
  })),
  useAppKitAccount: jest.fn(() => ({
    address: "0x1234567890123456789012345678901234567890",
    isConnected: true,
  })),
  useAppKitNetwork: jest.fn(() => ({
    chainId: 1,
    chain: { name: "Ethereum" },
  })),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  usePathname: jest.fn(() => "/"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }) => children,
}));

// Setup global test utilities
global.BigInt = BigInt;
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
