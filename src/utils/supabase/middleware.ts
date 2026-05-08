// middleware.ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type SetAllCookies } from "@supabase/ssr";

function isRetryableAuthError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const err = error as { name?: string; message?: string };
  if (err.name === "AuthRetryableFetchError") return true;
  if (typeof err.message === "string") {
    const msg = err.message.toLowerCase();
    return msg.includes("retryable") || msg.includes("failed to fetch") || msg.includes("network");
  }
  return false;
}

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((c) => c.name.includes("sb-") && c.name.includes("auth-token"));
}

export const updateSession = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const accept = request.headers.get("accept") || "";
  const expectsHtml = accept.includes("text/html");

  const PUBLIC_PATHS = ["/login", "/verify-otp", "/api/auth/bypass-session"];
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (isPublic) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  const supabaseCookies: Parameters<SetAllCookies>[0] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies: any) => {
          supabaseCookies.push(...cookies);
        },
      },
    }
  );

  let user = null;
  let authError: unknown = null;

  try {
    const result = await supabase.auth.getUser();
    user = result.data?.user ?? null;
    authError = result.error;
  } catch (error) {
    authError = error;
  }

  // Keep the updated auth cookies visible for the downstream route handler (same request).
  if (supabaseCookies.length > 0) {
    const cookieMap = new Map(
      request.cookies.getAll().map((cookie) => [cookie.name, cookie.value])
    );

    for (const { name, value, options } of supabaseCookies) {
      const shouldDelete = !value || options?.maxAge === 0;
      if (shouldDelete) {
        cookieMap.delete(name);
      } else {
        cookieMap.set(name, value);
      }
    }

    const headerValue = Array.from(cookieMap.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");

    if (headerValue) {
      requestHeaders.set("cookie", headerValue);
    } else {
      requestHeaders.delete("cookie");
    }
  }

  const applySupabaseCookies = (response: NextResponse) => {
    supabaseCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  };

  if (!user) {
    const hasAuthCookie = hasSupabaseAuthCookie(request);

    if (isRetryableAuthError(authError) || hasAuthCookie) {
      return applySupabaseCookies(
        NextResponse.next({ request: { headers: requestHeaders } })
      );
    }

    if (!expectsHtml) {
      return applySupabaseCookies(
        NextResponse.next({ request: { headers: requestHeaders } })
      );
    }

    return applySupabaseCookies(
      NextResponse.redirect(new URL("/login", request.url))
    );
  }

  return applySupabaseCookies(
    NextResponse.next({ request: { headers: requestHeaders } })
  );
}
