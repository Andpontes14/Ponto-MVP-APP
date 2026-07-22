import { NextRequest, NextResponse } from "next/server";

const protectedPages = ["/", "/admin"];
const protectedApiPrefixes = ["/api/hour-bank", "/api/vacations/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedPage =
    protectedPages.includes(pathname) || protectedPages.some((path) => path !== "/" && pathname.startsWith(`${path}/`));
  const isProtectedEmployeeWrite =
    pathname.startsWith("/api/employees") && request.method !== "GET";
  const isProtectedApi = protectedApiPrefixes.some((path) => pathname.startsWith(path));

  if (!isProtectedPage && !isProtectedEmployeeWrite && !isProtectedApi) {
    return NextResponse.next();
  }

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return new NextResponse("Admin password not configured.", { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  if (isAuthorized(authorization, username, password)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Ponto MVP Admin"'
    }
  });
}

function isAuthorized(authorization: string | null, username: string, password: string) {
  if (!authorization?.startsWith("Basic ")) return false;
  const encoded = authorization.slice("Basic ".length);
  const decoded = atob(encoded);
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;

  const suppliedUsername = decoded.slice(0, separatorIndex);
  const suppliedPassword = decoded.slice(separatorIndex + 1);
  return suppliedUsername === username && suppliedPassword === password;
}

export const config = {
  matcher: ["/", "/admin/:path*", "/api/employees/:path*", "/api/hour-bank/:path*", "/api/vacations/:path*"]
};
