import { readdirSync, statSync } from "fs";
import { getWidgets } from "../helpers/db";

let widgets;
let widgetFolders;
let widgetConfigs;

const getNewOnFetch = true;

export async function loadWidgets() {
  widgets = await getWidgets();

  const files = readdirSync("./widgets");

  widgetFolders = files.filter((file) => {
    return statSync(`./widgets/${file}`).isDirectory();
  });

  widgets.forEach((widget) => {
    if (!widgetFolders.includes(widget.id)) {
      throw new Error(`Widget ${widget.id} not found in widgets folder`);
      return;
    }
  });

  console.log(
    `✅Loaded widgets: ${widgets.map((widget) => widget.id).join(", ")}`
  );

  widgetConfigs = widgets;

  //convert widgets array into object with widget id as key
  widgets = widgets.reduce((acc, widget) => {
    acc[widget.id] = { id: widget.id, minPlan: widget.minPlan };
    return acc;
  }, {});

  await widgetFolders.forEach(async (widgetFolder) => {
    //load index.html, index.js into widgets
    let html = await Bun.file(`./widgets/${widgetFolder}/index.html`).text();
    let js = await Bun.file(`./widgets/${widgetFolder}/index.js`).text();

    widgets[widgetFolder].html = html;
    widgets[widgetFolder].js = js;
  });
}

export async function handleWidgetReq(req, res) {
  const id = req.params.id;
  if (!widgets[id]) {
    res.status(404).send("Widget not found");
    return;
  }
  if (getNewOnFetch) {
    //load this widget again
    widgets[id] = {
      ...widgets[id],
      html: await Bun.file(`./widgets/${id}/index.html`).text(),
      js: await Bun.file(`./widgets/${id}/index.js`).text(),
    };
  }

  res.send((({ minPlan, ...o }) => o)(widgets[id]));
}

export async function getWidgetsConfig(req, res) {
  if (getNewOnFetch) {
    await loadWidgets();
  }
  res.send(widgetConfigs);
}
