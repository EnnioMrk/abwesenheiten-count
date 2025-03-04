import { getAllSubjectAbsences, getAbsenceReasonIds } from "./analyze";
//import { login, getAbsences } from "./scraper";

//const page = await login("ennio.marke", "flufyflash1");

//const absenceData = (await getAbsences(page)).data;

let absenceData = await (await Bun.file("absenceData.json")).json();
absenceData = absenceData.data;

const absenceReasons = ["K", "K+E"]; //"V", "S"

const absenceReasonIds = Object.values(
  getAbsenceReasonIds(absenceData, absenceReasons)
);
absenceReasonIds.push(0);

const absenceCounts = getAllSubjectAbsences(absenceData, absenceReasonIds);

console.log(absenceCounts);

//Bun.write("absenceData.json", JSON.stringify(absenceData));
