// Jest setup file to mock database connections
const mysql = require("mysql2/promise");

// Mock mysql2 to prevent actual database connections during tests
jest.mock("mysql2/promise", () => ({
  createConnection: jest.fn(() => ({
    execute: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  })),
}));

// Mock console.error to reduce noise during tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});
