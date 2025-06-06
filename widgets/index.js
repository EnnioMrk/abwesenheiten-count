import { readdirSync, statSync } from "fs";
import { getWidgets } from "../helpers/db";

let widgets;
let widgetFolders;
let widgetConfigs;

const getNewOnFetch = true;

export async function loadWidgets() {
  try {
    widgets = await getWidgets();

    const files = readdirSync("./widgets");

    widgetFolders = files.filter((file) => {
      try {
        return statSync(`./widgets/${file}`).isDirectory();
      } catch (error) {
        console.error(
          `💥 Error checking widget directory ${file}:`,
          error.message
        );
        return false;
      }
    });

    for (const widget of widgets) {
      if (!widgetFolders.includes(widget.id)) {
        console.error(`❌ Widget ID ${widget.id} not found in widget folders`);
        continue;
      }
    }

    console.log(
      `✅ Loaded widgets: ${widgets.map((widget) => widget.id).join(", ")}`
    );

    widgetConfigs = widgets;

    //convert widgets array into object with widget id as key
    widgets = widgets.reduce((acc, widget) => {
      acc[widget.id] = { id: widget.id, minPlan: widget.minPlan };
      return acc;
    }, {});

    for (const widgetFolder of widgetFolders) {
      try {
        //load index.html, index.js into widgets
        let html = await Bun.file(
          `./widgets/${widgetFolder}/index.html`
        ).text();
        let js = await Bun.file(`./widgets/${widgetFolder}/index.js`).text();

        widgets[widgetFolder].html = html;
        widgets[widgetFolder].js = js;
      } catch (error) {
        console.error(
          `💥 Error loading widget ${widgetFolder}:`,
          error.message
        );
        // Remove the widget from the list if it fails to load
        delete widgets[widgetFolder];
      }
    }
  } catch (error) {
    console.error("💥 Error loading widgets:", error.message);
    throw error;
  }
}

export async function handleWidgetReq(req, res) {
  try {
    const id = req.params.id;
    if (!widgets[id]) {
      res.status(404).json({ error: "Widget not found" });
      return;
    }

    if (getNewOnFetch) {
      try {
        //load this widget again
        widgets[id] = {
          ...widgets[id],
          html: await Bun.file(`./widgets/${id}/index.html`).text(),
          js: await Bun.file(`./widgets/${id}/index.js`).text(),
        };
      } catch (error) {
        console.error(`💥 Error reloading widget ${id}:`, error.message);
        res.status(500).json({ error: "Failed to reload widget" });
        return;
      }
    }

    res.send((({ minPlan, ...o }) => o)(widgets[id]));
  } catch (error) {
    console.error("💥 Error handling widget request:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getWidgetsConfig(req, res) {
  if (getNewOnFetch) {
    await loadWidgets();
  }
  res.send(widgetConfigs);
}
