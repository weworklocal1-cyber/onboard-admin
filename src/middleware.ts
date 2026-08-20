import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env vars");
    return response;
  }
  
  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const PUBLIC_ACADEMY_PATHS = [
    "/academy",
    "/academy/login",
    "/academy/register",
    "/academy/courses",
    "/academy/certificates",
  ];

  const isPublicAcademyPath = PUBLIC_ACADEMY_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  const isCheckoutPath = pathname.startsWith("/academy/courses/") && pathname.endsWith("/checkout");

  if (pathname.startsWith("/academy") && !isPublicAcademyPath && !isCheckoutPath && !pathname.startsWith("/workforce")) {
    if (!user) {
      const loginUrl = new URL("/academy/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isCheckoutPath && !user) {
    const loginUrl = new URL("/academy/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/workforce") && !pathname.startsWith("/workforce/login")) {
    if (!user) {
      const loginUrl = new URL("/workforce/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};