// Unit tests for JWT Pizza Service functions and modules

describe("JWT Pizza Service", () => {
  // Test configuration loading
  describe("Configuration", () => {
    it("should load configuration without errors", () => {
      expect(() => {
        const config = require("../src/config.js");
        expect(config).toBeDefined();
      }).not.toThrow();
    });
  });

  // Test service module loading
  describe("Service Module", () => {
    it("should load service module without errors", () => {
      expect(() => {
        const service = require("../src/service.js");
        expect(service).toBeDefined();
      }).not.toThrow();
    });
  });

  // Test database model
  describe("Database Model", () => {
    it("should load database model without errors", () => {
      expect(() => {
        const dbModel = require("../src/database/dbModel.js");
        expect(dbModel).toBeDefined();
      }).not.toThrow();
    });
  });

  // Test router modules
  describe("Router Modules", () => {
    it("should load auth router without errors", () => {
      expect(() => {
        const authRouter = require("../src/routes/authRouter.js");
        expect(authRouter).toBeDefined();
      }).not.toThrow();
    });

    it("should load user router without errors", () => {
      expect(() => {
        const userRouter = require("../src/routes/userRouter.js");
        expect(userRouter).toBeDefined();
      }).not.toThrow();
    });

    it("should load order router without errors", () => {
      expect(() => {
        const orderRouter = require("../src/routes/orderRouter.js");
        expect(orderRouter).toBeDefined();
      }).not.toThrow();
    });

    it("should load franchise router without errors", () => {
      expect(() => {
        const franchiseRouter = require("../src/routes/franchiseRouter.js");
        expect(franchiseRouter).toBeDefined();
      }).not.toThrow();
    });
  });

  // Test utility functions
  describe("Utility Functions", () => {
    it("should have valid module exports", () => {
      const model = require("../src/model/model.js");
      expect(model).toBeDefined();
      expect(typeof model).toBe("object");
    });
  });

});
