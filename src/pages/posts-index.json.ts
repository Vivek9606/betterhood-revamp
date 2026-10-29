import index from "../data/posts-index.json";

// Served at /posts-index.json — powers search & filters on /learn/ without a backend.
export const GET = () => new Response(JSON.stringify(index), { headers: { "Content-Type": "application/json" } });
