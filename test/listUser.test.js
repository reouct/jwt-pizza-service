const request = require("supertest");
const express = require("express");

jest.mock("../src/database/database", () => {
  let nextId = 1;
  const users = [];
  return {
    DB: {
      addUser: jest.fn(async ({ name, email, password, roles }) => {
        const user = { id: nextId++, name, email, roles };
        users.push({ ...user, password });
        return user;
      }),
      loginUser: jest.fn(async () => true),
      isLoggedIn: jest.fn(async () => true),
      getUser: jest.fn(async (email, password) =>
        users.find((u) => u.email === email && u.password === password)
      ),
      updateUser: jest.fn(async (id, name, email) => ({
        id,
        name,
        email,
        roles: [{ role: "diner" }],
      })),
      getUsers: jest.fn(async () => []),
    },
    Role: { Diner: "diner", Admin: "Admin" },
  };
});

const userRouter = require("../src/routes/userRouter");
const { authRouter, setAuthUser } = require("../src/routes/authRouter");

const app = express();
app.use(express.json());
// set auth user middleware so authRouter.authenticateToken works
app.use(setAuthUser);
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

test("list users unauthorized", async () => {
  const listUsersRes = await request(app).get("/api/user");
  expect(listUsersRes.status).toBe(401);
});

test("list users", async () => {
  const userToken = await registerUser(request(app));
  const listUsersRes = await request(app)
    .get("/api/user")
    .set("Authorization", "Bearer " + userToken);
  expect(listUsersRes.status).toBe(200);
});

async function registerUser(service) {
  const testUser = {
    name: "pizza diner",
    email: `${randomName()}@test.com`,
    password: "a",
  };
  const registerRes = await service.post("/api/auth").send(testUser);
  // ensure password is available on returned user for other tests if needed
  if (registerRes.body && registerRes.body.user) {
    registerRes.body.user.password = testUser.password;
  }

  return registerRes.body.token;
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}
