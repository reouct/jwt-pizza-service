import { sleep, check, group, fail } from "k6";
import http from "k6/http";
import jsonpath from "https://jslib.k6.io/jsonpath/1.0.2/index.js";

export const options = {
  cloud: {
    distribution: {
      "amazon:us:ashburn": { loadZone: "amazon:us:ashburn", percent: 100 },
    },
    apm: [],
  },
  thresholds: {},
  scenarios: {
    Scenario_1: {
      executor: "ramping-vus",
      gracefulStop: "30s",
      stages: [
        { target: 5, duration: "30s" },
        { target: 15, duration: "1m" },
        { target: 10, duration: "30s" },
        { target: 0, duration: "30s" },
      ],
      gracefulRampDown: "30s",
      exec: "scenario_1",
    },
  },
};

export function scenario_1() {
  let response;
  const vars = {};

  // 1) LOGIN
  response = http.put(
    "https://pizza-service.reouct.click/api/auth",
    '{"email":"d@jwt.com","password":"diner"}',
    {
      headers: {
        accept: "*/*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
        "content-type": "application/json",
        origin: "https://pizza.reouct.click",
        priority: "u=1, i",
        "sec-ch-ua":
          '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
      },
    }
  );

  // CHECK: login succeeded
  const loginOk = check(response, {
    "login status is 200": (r) => r.status === 200,
  });
  if (!loginOk) {
    fail(`Login failed, status was ${response.status}`);
  }

  // get auth token from login response
  vars["token"] = jsonpath.query(response.json(), "$.token")[0];

  // preflight OPTIONS for login
  response = http.options("https://pizza-service.reouct.click/api/auth", null, {
    headers: {
      accept: "*/*",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
      "access-control-request-headers": "content-type",
      "access-control-request-method": "PUT",
      origin: "https://pizza.reouct.click",
      priority: "u=1, i",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    },
  });
  sleep(3.9);

  // 2) MENU
  response = http.get("https://pizza-service.reouct.click/api/order/menu", {
    headers: {
      accept: "*/*",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
      authorization: `Bearer ${vars["token"]}`,
      "content-type": "application/json",
      origin: "https://pizza.reouct.click",
      priority: "u=1, i",
      "sec-ch-ua":
        '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    },
  });

  response = http.options(
    "https://pizza-service.reouct.click/api/order/menu",
    null,
    {
      headers: {
        accept: "*/*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
        "access-control-request-headers": "authorization,content-type",
        "access-control-request-method": "GET",
        origin: "https://pizza.reouct.click",
        priority: "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
      },
    }
  );

  // 3) FRANCHISE LIST
  response = http.get(
    "https://pizza-service.reouct.click/api/franchise?page=0&limit=20&name=*",
    {
      headers: {
        accept: "*/*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
        authorization: `Bearer ${vars["token"]}`,
        "content-type": "application/json",
        origin: "https://pizza.reouct.click",
        priority: "u=1, i",
        "sec-ch-ua":
          '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
      },
    }
  );

  response = http.options(
    "https://pizza-service.reouct.click/api/franchise?page=0&limit=20&name=*",
    null,
    {
      headers: {
        accept: "*/*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
        "access-control-request-headers": "authorization,content-type",
        "access-control-request-method": "GET",
        origin: "https://pizza.reouct.click",
        priority: "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
      },
    }
  );
  sleep(3.3);

  // 4) USER INFO
  response = http.get("https://pizza-service.reouct.click/api/user/me", {
    headers: {
      accept: "*/*",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
      authorization: `Bearer ${vars["token"]}`,
      "content-type": "application/json",
      origin: "https://pizza.reouct.click",
      priority: "u=1, i",
      "sec-ch-ua":
        '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    },
  });

  response = http.options(
    "https://pizza-service.reouct.click/api/user/me",
    null,
    {
      headers: {
        accept: "*/*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
        "access-control-request-headers": "authorization,content-type",
        "access-control-request-method": "GET",
        origin: "https://pizza.reouct.click",
        priority: "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
      },
    }
  );
  sleep(0.8);

  // 5) PLACE ORDER (PURCHASE)
  response = http.post(
    "https://pizza-service.reouct.click/api/order",
    '{"items":[{"menuId":1,"description":"Veggie","price":0.0038},{"menuId":2,"description":"Pepperoni","price":0.0042}],"storeId":"1","franchiseId":1}',
    {
      headers: {
        accept: "*/*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
        authorization: `Bearer ${vars["token"]}`,
        "content-type": "application/json",
        origin: "https://pizza.reouct.click",
        priority: "u=1, i",
        "sec-ch-ua":
          '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
      },
    }
  );

  // CHECK: purchase succeeded (adjust expected code if your API uses 201 or something else)
  const purchaseOk = check(response, {
    "order status is 200 or 201": (r) => r.status === 200 || r.status === 201,
  });
  if (!purchaseOk) {
    fail(`Order creation failed, status was ${response.status}`);
  }

  // Get JWT for verification from the purchase response (no hard-coded JWT)
  // Adjust the JSONPath if your API uses a different field than "jwt"
  const orderJwtArr = jsonpath.query(response.json(), "$.jwt");
  if (!orderJwtArr || orderJwtArr.length === 0) {
    fail("No JWT found in order response");
  }
  vars["orderJwt"] = orderJwtArr[0];

  response = http.options(
    "https://pizza-service.reouct.click/api/order",
    null,
    {
      headers: {
        accept: "*/*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
        "access-control-request-headers": "authorization,content-type",
        "access-control-request-method": "POST",
        origin: "https://pizza.reouct.click",
        priority: "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
      },
    }
  );
  sleep(1.1);

  // 6) VERIFY ORDER using JWT from purchase response (no hard-coded JWT)
  const verifyBody = JSON.stringify({ jwt: vars["orderJwt"] });

  response = http.post(
    "https://pizza-factory.cs329.click/api/order/verify",
    verifyBody,
    {
      headers: {
        accept: "*/*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
        authorization: `Bearer ${vars["token"]}`,
        "content-type": "application/json",
        origin: "https://pizza.reouct.click",
        priority: "u=1, i",
        "sec-ch-ua":
          '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-fetch-storage-access": "active",
      },
    }
  );

  // Optional: CHECK verify status as well
  check(response, {
    "verify status is 200": (r) => r.status === 200,
  });

  response = http.options(
    "https://pizza-factory.cs329.click/api/order/verify",
    null,
    {
      headers: {
        accept: "*/*",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
        "access-control-request-headers": "authorization,content-type",
        "access-control-request-method": "POST",
        origin: "https://pizza.reouct.click",
        priority: "u=1, i",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
      },
    }
  );
}
