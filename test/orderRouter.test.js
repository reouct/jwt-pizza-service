const request = require("supertest");
const express = require("express");

jest.mock("../src/database/database", () => {
  return {
    DB: {
      getMenu: jest.fn(),
    },
  };
});

const { DB } = require("../src/database/database");
const orderRouter = require("../src/routes/orderRouter");

describe("orderRouter", () => {
  describe("GET /menu", () => {
    it("should return menu items", async () => {
      const mockMenu = [{ id: 1, title: "Veggie", price: 0.0038 }];
      DB.getMenu.mockResolvedValue(mockMenu);

      const app = express();
      app.use(express.json());
      app.use("/", orderRouter);

      const res = await request(app).get("/menu");
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockMenu);
      expect(DB.getMenu).toHaveBeenCalled();
    });
  });
});
