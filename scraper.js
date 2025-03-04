import puppeteer from "puppeteer";
import {
  getAllLessonCount,
  getAllLessonCountAllMonths,
  getSchoolYearStart,
} from "./utils";
//import puppeteer from "puppeteer-extra";
//import StealthPlugin from "puppeteer-extra-plugin-stealth";

// add the stealth plugin
//puppeteer.use(StealthPlugin());

export async function login(user, psw, progressCallback) {
  progressCallback("Starting login process...", 5);
  const url =
    "https://perseus.webuntis.com/WebUntis/?school=Gymnasium+im+Schloss#/basic/login";
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximised"],
  });

  progressCallback("Browser launched successfully", 10);
  const page = await browser.newPage();

  page.setDefaultNavigationTimeout(0);
  page.setDefaultTimeout(0);

  progressCallback("Navigating to login page...", 15);
  await page.goto(url);

  progressCallback("Waiting for login elements...", 20);
  const loginButton = await page.waitForSelector(".redesigned-button.mt-1");

  await loginButton.click();
  progressCallback("Clicked initial login button", 30);

  const accountInput = await page.waitForSelector('input[name="_username"]');
  const passwordInput = await page.waitForSelector('input[name="_password"]');
  const loginSubmit = await page.waitForSelector(
    ".btn.btn-primary.login-button"
  );

  progressCallback("Entering credentials...", 35);
  await accountInput.type(user);
  await passwordInput.type(psw);
  await loginSubmit.click();

  progressCallback("Waiting for legitimate button...", 60);
  const legitimateButton = await page.waitForSelector(
    'button[name="accepted"]'
  );

  await legitimateButton.click();
  progressCallback("Legitimate button clicked - Login process complete", 70);

  return { page, browser };
}

export async function getAbsences(page, progressCallback) {
  progressCallback("Waiting for page to load", 75);
  await page.waitForNavigation();
  progressCallback("Page loaded", 80);

  let token;
  await page.exposeFunction("sendToken", (data) => {
    token = data;
  });

  await page.evaluate(async () => {
    let res = await fetch(
      "https://perseus.webuntis.com/WebUntis/api/token/new",
      {
        headers: {
          accept: "application/json, text/plain, */*",
        },
        method: "GET",
      }
    );
    let data = await res.text();
    window.sendToken(data);
  });

  while (!token) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("token", token);

  let res = await fetch(
    "https://perseus.webuntis.com/WebUntis/api/rest/view/v1/app/data",
    {
      headers: {
        accept: "application/json, text/plain, */*",
        authorization: `Bearer ${token}`,
      },
      method: "GET",
    }
  );

  let userData = await res.json();

  return new Promise(async (resolve) => {
    await page.exposeFunction("sendAbsenceData", (data) => {
      console.log(data);
      progressCallback("Absence data received", 90);
      resolve({ absenceData: data, userData, token });
    });
    console.log("Fetching Absence Data");

    console.log(userData.user.person.id);
    await page.evaluate(async (userData) => {
      const res = await fetch(
        `https://perseus.webuntis.com/WebUntis/api/classreg/absencetimes/student?startDate=20240805&endDate=20250702&studentId=${userData.user.person.id}&excuseStatusId=-1&excludeAbsences=false&excludeLateness=false`,
        {
          headers: {
            accept: "application/json",
            "tenant-id": "2278200",
          },
          method: "GET",
        }
      );

      const data = await res.json();
      window.sendAbsenceData(data);
    }, userData);
  });
}

export async function getLessons(page, token, personId) {
  const schholYearStart = await getSchoolYearStart();

  let timetableData;
  await page.exposeFunction("sendTimetable", (data) => {
    timetableData = data;
  });

  await page.evaluate(
    async (token, schholYearStart, personId) => {
      let res = await fetch(
        `https://perseus.webuntis.com/WebUntis/api/rest/view/v1/timetable/entries?start=${schholYearStart}&end=${
          new Date().toISOString().split("T")[0]
        }&format=5&resourceType=STUDENT&resources=${personId}&periodTypes=&timetableType=MY_TIMETABLE`,
        {
          headers: {
            accept: "application/json, text/plain, */*",
            authorization: `Bearer ${token}`,
            "tenant-id": "2278200",
            "x-webuntis-api-school-year-id": "13",
          },
          body: null,
          method: "GET",
        }
      );
      let data = await res.json();
      window.sendTimetable(data);
    },
    token,
    schholYearStart,
    personId
  );

  while (!timetableData) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  Bun.write("timetable.json", JSON.stringify(timetableData));

  return await getAllLessonCountAllMonths(timetableData);
}
