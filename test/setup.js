// Mock mysql2 to prevent actual database connections during tests
jest.mock("mysql2/promise", () => ({
  createConnection: jest.fn(() => ({
    execute: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  })),
}));

// Mock the database module to prevent initialization
jest.mock("../src/database/database.js", () => {
  const mockDBInstance = {
    isLoggedIn: jest.fn(),
    loginUser: jest.fn(),
    logoutUser: jest.fn(),
    addUser: jest.fn(),
    getUser: jest.fn(),
    initialized: Promise.resolve(),
  };

  return {
    DB: mockDBInstance,
    Role: { Diner: "diner", Admin: "admin", Franchisee: "franchisee" },
  };
});

// Mock console.error to reduce noise during tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});
