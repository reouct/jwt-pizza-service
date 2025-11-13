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

  vars["token"] = jsonpath.query(response.json(), "$.token")[0];

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

  response = http.post(
    "https://pizza-factory.cs329.click/api/order/verify",
    '{"jwt":"eyJpYXQiOjE3NjMwNjcwNjUsImV4cCI6MTc2MzE1MzQ2NSwiaXNzIjoiY3MzMjkuY2xpY2siLCJhbGciOiJSUzI1NiIsImtpZCI6Ik9TcF94VzhlM3kwNk1KS3ZIeW9sRFZMaXZXX2hnTWxhcFZSUVFQVndiY0UifQ.eyJ2ZW5kb3IiOnsiaWQiOiJsaXUyMDAzIiwibmFtZSI6IkJvd2VuIExpdSJ9LCJkaW5lciI6eyJpZCI6MiwibmFtZSI6InBpenphIGRpbmVyIiwiZW1haWwiOiJkQGp3dC5jb20ifSwib3JkZXIiOnsiaXRlbXMiOlt7Im1lbnVJZCI6MSwiZGVzY3JpcHRpb24iOiJWZWdnaWUiLCJwcmljZSI6MC4wMDM4fSx7Im1lbnVJZCI6MiwiZGVzY3JpcHRpb24iOiJQZXBwZXJvbmkiLCJwcmljZSI6MC4wMDQyfV0sInN0b3JlSWQiOiIxIiwiZnJhbmNoaXNlSWQiOjEsImlkIjo0NX19.OMrIpLrzZ_w_AdfqITw8ejLugXakGZYDIizxfGCeFWNxi6G_zins6IS6i2Y0oRPPUOQZnlyVHYMD2z0pJU5la_cSRlNsx2aKPbxgO0OuB06VXhMxMmBjduxPqDeg5L0adahIEXC0BFt_IG70XbB9TE5Rw8upnq9T4Re1dXB31yim46S_u32vbwQBbgjo3agCT2XXdi_fIkiHuEqWbgekr5WlQw9M1lStwcvEE0EfGtnHI5q4t7dlNLjsoSfb77u8mQNcEZyRBTAV0zOV2TcV_RBlnymAOHMRwZWcg68Yg3xX3iMlYNMMHl45FNspYmM18VFFy8ZiDVJRYmuJW8HXe7Wp2zAel4kuPq-payRlO_CUF3Me01tjMTDoBW01bi_umN1mgtpuglZQhuxt8D8Ua93lxXiqhQdhv2CN_u5OQOdli0AuKQZpWgAnc7lEs9YKNVqQoJUW9ac5AJY0kz4bfdZWCk2iwOtyS_RGlifYeFj7MQNftyaTBIgIKAWUbiEF6SKdsXb6PyKQ63DtUiZUeIUO7gjBIRZxhVle-UoFeNKpdy1jXqESxruhGkUFIEsLZgGTh37SL7r2-fTwYU7H2RIus1jS84QgYfR4MHnGNVsALICOWN6X-etKVkhRCcXAPOsmrWyuyeFmPFg6eg-e-Wdv8HuDWG0AlpzmJyoyNrk"}',
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
