// Legacy compatibility endpoint. Census is a separate planned module and does not
// export Job Matching employment survey data.
export async function GET() {
  return Response.json(
    { error: "Community Census export is not implemented yet. Employment survey analytics belong to Job Matching." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
