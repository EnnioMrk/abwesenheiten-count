export default async function getLayouts(req, res) {
  const layoutData = await Bun.file("static/dashboard/layouts.json").json();
  res.json(layoutData);
}
