import { NextRequest } from "next/server";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(
  async (req: NextRequest & { user: any }, user) => {
    return Response.json({
      success: true,
      user,
    });
  }
);
