import index from "../data/physios-index.json";

// Served at /physios-index.json — powers filtering on /physio-directory/.
export const GET = () => new Response(JSON.stringify(index), { headers: { "Content-Type": "application/json" } });
