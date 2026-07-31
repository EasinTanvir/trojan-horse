/**
 * Place search for the report form, proxying OpenStreetMap's Nominatim.
 *
 * Free and keyless, like the map tiles (01-architecture.md: no paid APIs).
 * Proxied rather than called from the browser so we can send the User-Agent
 * Nominatim's usage policy requires, and so the app isn't hammering them from
 * every visitor's IP.
 *
 * Results are biased to Bangladesh — this is a Dhaka civic tool, and an
 * unbiased search returns a Gulshan in half a dozen countries.
 */
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const BANGLADESH_VIEWBOX = "88.0,26.7,92.7,20.5";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (query.length < 3) {
    return Response.json({ success: true, error: null, data: [] });
  }

  const url = new URL(NOMINATIM);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("countrycodes", "bd");
  url.searchParams.set("viewbox", BANGLADESH_VIEWBOX);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "NirapodPath/1.0 (civic hazard reporting, Dhaka)",
        "Accept-Language": "en",
      },
      /* Same query gives the same answer for a good while. */
      next: { revalidate: 3600 },
    });

    if (!response.ok) throw new Error(`Nominatim ${response.status}`);

    const results = await response.json();

    return Response.json({
      success: true,
      error: null,
      data: results.map((row) => ({
        id: `${row.osm_type}-${row.osm_id}`,
        label: row.display_name,
        lat: Number(row.lat),
        lng: Number(row.lon),
      })),
    });
  } catch (error) {
    console.error("GET /api/geocode failed:", error);
    return Response.json(
      { success: false, error: "Couldn't search for that place.", data: null },
      { status: 502 },
    );
  }
}
